import { BadRequestException, HttpException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import dayjs from 'dayjs';
import { Organization } from '@prisma/client';
import {
  PaymentInvoice,
  PaymentPlatform,
  PaymentProvider,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

import { LEMONSQUEEZY_PROVIDER } from '@gitroom/nestjs-libraries/services/payment/payment.providers';

interface LemonSqueezySubscription {
  id: string;
  attributes: {
    store_id: number;
    variant_id: number;
    status:
      | 'on_trial'
      | 'active'
      | 'paused'
      | 'past_due'
      | 'unpaid'
      | 'cancelled'
      | 'expired';
    cancelled: boolean;
    pause: { mode: 'void' | 'free' } | null;
    trial_ends_at: string | null;
    renews_at: string | null;
    ends_at: string | null;
    urls: { customer_portal: string };
  };
}

interface LemonSqueezyInvoice {
  id: string;
  attributes: {
    status: 'pending' | 'paid' | 'void' | 'refunded' | 'partial_refund';
    currency: string;
    total: number;
    created_at: string;
    urls: { invoice_url: string | null };
  };
}

// Every event that can change a subscription, each one re-syncs it from the API
const SUBSCRIPTION_EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_payment_success',
  'subscription_payment_recovered',
];

// Lemon Squeezy is the merchant of record for web subscriptions (hosted
// checkout, taxes, customer portal). Like RevenueCat, the webhook only tells us
// *which* subscription changed; its state is always loaded from the API so
// events arriving out of order can't apply a stale state.
// The organization id is passed as checkout custom data and the Lemon Squeezy
// subscription id is stored as the Subscription identifier.
// LEMONSQUEEZY_VARIANTS maps <TIER>_<PERIOD> to a variant id, e.g. {"PRO_YEARLY": "123"}
@PaymentProvider({ provider: LEMONSQUEEZY_PROVIDER })
export class LemonSqueezyProvider extends PaymentProviderAbstract {
  platform: PaymentPlatform = 'web';

  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService,
    private _userService: UsersService
  ) {
    super();
  }

  validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = Buffer.from(String(headers['x-signature'] || ''), 'utf8');
    const digest = Buffer.from(
      createHmac('sha256', secret || '')
        .update(rawBody || '')
        .digest('hex'),
      'utf8'
    );

    if (
      !secret ||
      signature.length !== digest.length ||
      !timingSafeEqual(digest, signature)
    ) {
      throw new HttpException('Invalid webhook signature', 401);
    }

    return JSON.parse(rawBody.toString('utf8'));
  }

  // Must never throw: a failure is logged instead of leaving billing half applied
  async processWebhook(event: any) {
    const eventName = event?.meta?.event_name;
    if (!SUBSCRIPTION_EVENTS.includes(eventName)) {
      return { ok: true };
    }

    // subscription events carry the subscription, payment events its invoice
    const subscriptionId = String(
      (event.data?.type === 'subscriptions'
        ? event.data?.id
        : event.data?.attributes?.subscription_id) || ''
    );

    try {
      if (!subscriptionId) {
        return { ok: true };
      }

      const organizationId = await this.getOrganizationId(
        event,
        subscriptionId
      );
      if (!organizationId) {
        console.log('lemonsqueezy_webhook_unknown_organization', {
          lemonsqueezy_event_name: eventName,
          lemonsqueezy_subscription_id: subscriptionId,
        });
        return { ok: true };
      }

      const subscription = await this.getSubscription(subscriptionId);
      if (subscription) {
        await this.applySubscription(organizationId, subscription);
      }
    } catch (err) {
      console.error(
        'lemonsqueezy_webhook_failed',
        {
          lemonsqueezy_event_name: eventName,
          lemonsqueezy_subscription_id: subscriptionId,
        },
        err
      );
    }

    return { ok: true };
  }

  // New subscription: hosted checkout. Existing one: switch its variant, the
  // proration is charged right away like the Stripe plan change.
  override async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    const id = makeId(10);
    const variantId = this.variantId(body.billing, body.period);
    const current = await this.getCurrent(organizationId);

    if (current) {
      let subscription: LemonSqueezySubscription;
      try {
        const organization = await this._organizationService.getOrgById(
          organizationId
        );
        // a subscription set to cancel is resumed before switching
        if (current.cancelAt) {
          await this.updateSubscription(current.identifier!, {
            cancelled: false,
          });
        }
        subscription = await this.updateSubscription(current.identifier!, {
          variant_id: Number(variantId),
          invoice_immediately: !organization?.isTrailing,
        });
      } catch (err) {
        console.error(
          'lemonsqueezy_change_plan_failed',
          { lemonsqueezy_subscription_id: current.identifier },
          err
        );
        return {
          portal: (await this.portalLink(organizationId)).url,
        };
      }

      await this.applySubscription(organizationId, subscription);

      // the plan changed but its prorated charge was declined
      if (['past_due', 'unpaid'].includes(subscription.attributes.status)) {
        return { portal: subscription.attributes.urls.customer_portal };
      }

      return { id };
    }

    const user = await this._userService.getUserById(userId);
    const isUtm = body.utm ? `&utm_source=${body.utm}` : '';
    const { data } = await this.request('/checkouts', 'POST', {
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            enabled_variants: [Number(variantId)],
            redirect_url:
              process.env['FRONTEND_URL'] +
              `/launches?onboarding=true&trialStart=true&check=${id}${isUtm}`,
          },
          checkout_options: {
            skip_trial: !allowTrial,
          },
          checkout_data: {
            ...(user?.email?.includes('@') ? { email: user.email } : {}),
            custom: {
              organization_id: organizationId,
              user_id: userId,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(process.env.LEMONSQUEEZY_STORE_ID),
            },
          },
          variant: {
            data: { type: 'variants', id: variantId },
          },
        },
      },
    });

    return { url: data.attributes.url as string };
  }

  // Lemon Squeezy has no invoice preview, the prorated amount shows on the
  // plan change invoice. Without a price the plan cards show no estimate.
  override async prorate(organizationId: string, body: BillingSubscribeDto) {
    return {};
  }

  // Toggle cancel-at-period-end
  override async setToCancel(organizationId: string) {
    const id = makeId(10);
    const current = await this.getCurrent(organizationId);
    if (!current) {
      throw new BadRequestException('No active subscription found');
    }

    const existing = await this.getSubscription(current.identifier!);
    if (!existing) {
      throw new BadRequestException('No active subscription found');
    }

    const subscription = await this.updateSubscription(current.identifier!, {
      cancelled: !existing.attributes.cancelled,
    });
    await this.applySubscription(organizationId, subscription);

    return {
      id,
      cancel_at:
        subscription.attributes.cancelled && subscription.attributes.ends_at
          ? new Date(subscription.attributes.ends_at)
          : undefined,
    };
  }

  // Account deletion. Nothing to cancel returns quietly; a failed cancel
  // throws so the deletion is retried instead of charging a deleted account.
  override async cancelAllSubscriptions(organizationId: string) {
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      return;
    }

    const current = await this.getCurrent(organizationId);
    if (!current) {
      return;
    }

    const subscription = await this.getSubscription(current.identifier!);
    if (
      subscription &&
      this.isLive(subscription) &&
      !subscription.attributes.cancelled
    ) {
      await this.request(
        `/subscriptions/${encodeURIComponent(current.identifier!)}`,
        'DELETE'
      );
    }

    await this._subscriptionService.deleteSubscriptionByOrgId(
      organizationId,
      LEMONSQUEEZY_PROVIDER
    );
  }

  // The portal URL is pre-signed for 24 hours, so it is loaded on every request
  override async portalLink(organizationId: string) {
    const current = await this.getCurrent(organizationId);
    if (!current) {
      throw new BadRequestException('No active subscription found');
    }

    const subscription = await this.getSubscription(current.identifier!);
    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    return { url: subscription.attributes.urls.customer_portal };
  }

  override async getInvoices(
    organizationId: string
  ): Promise<PaymentInvoice[]> {
    const current = await this.getCurrent(organizationId);
    if (!current) {
      return [];
    }

    const params = new URLSearchParams({
      'filter[subscription_id]': current.identifier!,
      'page[size]': '100',
    });
    const { data } = await this.request<{ data: LemonSqueezyInvoice[] }>(
      `/subscription-invoices?${params}`
    );

    return data
      .map(
        (invoice): PaymentInvoice => ({
          id: String(invoice.id),
          number: null,
          // invoices don't say which variant they billed
          tier: null,
          period: null,
          description: null,
          amount: invoice.attributes.total,
          currency: invoice.attributes.currency.toLowerCase(),
          created: dayjs(invoice.attributes.created_at).unix(),
          // invoices have no billing period, the subscription's period is used
          periodEnd: dayjs(invoice.attributes.created_at)
            .add(1, current.period === 'YEARLY' ? 'year' : 'month')
            .unix(),
          status:
            invoice.attributes.status === 'paid' ||
            invoice.attributes.status === 'partial_refund'
              ? 'paid'
              : invoice.attributes.status === 'pending'
              ? 'pending'
              : 'void',
          downloadUrl: invoice.attributes.urls?.invoice_url || null,
          viewUrl: null,
        })
      )
      .sort((a, b) => b.created - a.created);
  }

  override async getRenewalDate(organizationId: string) {
    const current = await this.getCurrent(organizationId);
    if (!current) {
      return { renewsAt: null, trialing: false };
    }

    const subscription = await this.getSubscription(current.identifier!);
    if (!subscription) {
      return { renewsAt: null, trialing: false };
    }

    const { attributes } = subscription;
    const trialing = attributes.status === 'on_trial';
    const renewsAt = trialing ? attributes.trial_ends_at : attributes.renews_at;
    return {
      renewsAt: renewsAt ? dayjs(renewsAt).unix() : null,
      trialing,
    };
  }

  // Post-checkout poll. The checkout redirect can't carry the Lemon Squeezy
  // subscription id, so it waits for the webhook to store the subscription.
  override async checkSubscription(
    organizationId: string,
    subscriptionId: string
  ) {
    return (await this.getCurrent(organizationId)) ? 2 : 0;
  }

  // Ending the trial now makes Lemon Squeezy charge the first payment, the
  // webhook then moves the organization out of the trial
  override async finishTrial(organization: Organization) {
    const current = await this.getCurrent(organization.id);
    if (!current) {
      throw new BadRequestException('No active subscription found');
    }

    await this.updateSubscription(current.identifier!, {
      trial_ends_at: new Date().toISOString(),
    });

    return { requiresAction: false };
  }

  // Mirror a Lemon Squeezy subscription onto the organization
  private async applySubscription(
    organizationId: string,
    subscription: LemonSqueezySubscription
  ) {
    const { attributes } = subscription;
    const subscriptionId = String(subscription.id);

    // another store of the same Lemon Squeezy account
    if (
      String(attributes.store_id) !== String(process.env.LEMONSQUEEZY_STORE_ID)
    ) {
      return;
    }

    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    const organization = await this._organizationService.getOrgById(
      organizationId
    );

    if (!organization || organization.deletedAt || !this.isLive(subscription)) {
      // an older subscription ending must not downgrade the current one
      if (current?.identifier === subscriptionId) {
        await this._subscriptionService.deleteSubscriptionByOrgId(
          organizationId,
          LEMONSQUEEZY_PROVIDER
        );
      }
      return;
    }

    const plan = this.parseVariant(attributes.variant_id);
    if (!plan) {
      console.error('lemonsqueezy_unknown_variant', {
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_variant_id: attributes.variant_id,
      });
      return;
    }

    // two checkouts paid for the same organization: the first live one is
    // kept and the newer one cancelled, like the Stripe duplicate check
    if (
      current?.provider === LEMONSQUEEZY_PROVIDER &&
      this.isLemonSqueezyId(current.identifier) &&
      current.identifier !== subscriptionId &&
      (await this.isLiveSubscription(current.identifier!))
    ) {
      if (!attributes.cancelled) {
        await this.request(
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
          'DELETE'
        );
      }
      console.log('lemonsqueezy_duplicate_subscription_cancelled', {
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_current_subscription_id: current.identifier,
      });
      return;
    }

    return this._subscriptionService.createOrUpdateSubscriptionByOrg(
      attributes.status === 'on_trial',
      organizationId,
      LEMONSQUEEZY_PROVIDER,
      subscriptionId,
      pricing[plan.billing].channel!,
      plan.billing,
      plan.period,
      attributes.cancelled && attributes.ends_at
        ? dayjs(attributes.ends_at).unix()
        : null
    );
  }

  // A cancelled subscription is usable until ends_at, past_due while the
  // payment is retried, and a "free" pause keeps the service running
  private isLive(subscription: LemonSqueezySubscription) {
    const { status, pause } = subscription.attributes;
    return (
      ['on_trial', 'active', 'past_due', 'cancelled'].includes(status) ||
      (status === 'paused' && pause?.mode === 'free')
    );
  }

  private async isLiveSubscription(subscriptionId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    return !!subscription && this.isLive(subscription);
  }

  // Custom data is set on the checkout. Invoice events may not carry it, the
  // stored subscription identifier covers them.
  private async getOrganizationId(event: any, subscriptionId: string) {
    const organizationId = event?.meta?.custom_data?.organization_id;
    if (organizationId) {
      return String(organizationId);
    }

    const current = await this._subscriptionService.getSubscriptionByIdentifier(
      subscriptionId
    );
    return current?.provider === LEMONSQUEEZY_PROVIDER
      ? current.organizationId
      : undefined;
  }

  // The organization's subscription row when Lemon Squeezy owns it
  private async getCurrent(organizationId: string) {
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    return current?.provider === LEMONSQUEEZY_PROVIDER &&
      this.isLemonSqueezyId(current.identifier)
      ? current
      : undefined;
  }

  // Admin granted subscriptions (/billing/add-subscription) have a random
  // identifier instead of a (numeric) Lemon Squeezy id, nothing to manage
  private isLemonSqueezyId(identifier: string | null) {
    return /^\d+$/.test(identifier || '');
  }

  // undefined when Lemon Squeezy doesn't know the id (removed, or created in
  // the other test / live mode)
  private async getSubscription(subscriptionId: string) {
    try {
      const { data } = await this.request<{ data: LemonSqueezySubscription }>(
        `/subscriptions/${encodeURIComponent(subscriptionId)}`
      );
      return data;
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 404) {
        return undefined;
      }
      throw err;
    }
  }

  private async updateSubscription(
    subscriptionId: string,
    attributes: Record<string, unknown>
  ) {
    const { data } = await this.request<{ data: LemonSqueezySubscription }>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      'PATCH',
      { data: { type: 'subscriptions', id: subscriptionId, attributes } }
    );
    return data;
  }

  private async request<T = any>(
    path: string,
    method = 'GET',
    body?: object
  ): Promise<T> {
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      throw new HttpException('Lemon Squeezy is not configured', 400);
    }

    const response = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      throw new HttpException(
        `Lemon Squeezy request failed (${response.status})`,
        response.status === 404 ? 404 : 500
      );
    }

    return response.json();
  }

  private variants(): Record<string, string | number> {
    try {
      return JSON.parse(process.env.LEMONSQUEEZY_VARIANTS || '{}');
    } catch (err) {
      console.error('lemonsqueezy_variants_invalid_json', err);
      return {};
    }
  }

  private variantId(billing: string, period: string) {
    const variantId = this.variants()[`${billing}_${period}`];
    if (!variantId) {
      throw new HttpException(
        `No Lemon Squeezy variant configured for ${billing}_${period}`,
        400
      );
    }

    return String(variantId);
  }

  private parseVariant(variantId: number) {
    const [billing, period] = (
      Object.entries(this.variants()).find(
        ([, id]) => String(id) === String(variantId)
      )?.[0] || ''
    ).split('_');

    if (
      !['MONTHLY', 'YEARLY'].includes(period) ||
      !['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'].includes(billing)
    ) {
      return undefined;
    }

    return {
      billing: billing as 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
      period: period as 'MONTHLY' | 'YEARLY',
    };
  }
}
