'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import dynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { capitalize } from 'lodash';
import clsx from 'clsx';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { CheckIconComponent } from '@gitroom/frontend/components/ui/check.icon.component';
import {
  FAQComponent,
  FAQSection,
} from '@gitroom/frontend/components/billing/faq.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import useCookie from 'react-use-cookie';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { DeveloperIconComponent } from '@gitroom/frontend/components/developer/developer.icon.component';
import { InvoicesComponent } from '@gitroom/frontend/components/layout/invoices.component';
import { STRIPE_PROVIDER } from '@gitroom/nestjs-libraries/services/payment/payment.providers';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

const EmbeddedBilling = dynamic(
  () =>
    import('@gitroom/frontend/components/billing/embedded.billing').then(
      (mod) => mod.EmbeddedBilling
    ),
  {
    ssr: false,
  }
);

export const FirstBillingComponent = () => {
  const { stripeClient, paymentProvider } = useVariables();
  // Stripe renders its checkout inside the page, other providers host it
  const embedded = paymentProvider === STRIPE_PROVIDER;
  const user = useUser();
  const dub = useDubClickId();
  const [stripe, setStripe] = useState<null | Promise<Stripe>>(null);
  const [stripeFailed, setStripeFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [tier, setTier] = useState('STANDARD');
  const [period, setPeriod] = useState('MONTHLY');
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const modals = useModals();
  const t = useT();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id', '');
  const [datafast_session_id] = useCookie('datafast_session_id', '');
  const [fbc] = useCookie('_fbc', '');
  const [fbp] = useCookie('_fbp', '');

  useEffect(() => {
    if (!embedded) {
      return;
    }
    const stripePromise = loadStripe(stripeClient);
    stripePromise.catch(() => setStripeFailed(true));
    setStripe(stripePromise);
  }, []);

  const loadCheckout = useCallback(async () => {
    return (
      await fetch('/billing/embedded', {
        method: 'POST',
        body: JSON.stringify({
          billing: tier,
          period: period,
          ...(datafast_visitor_id && datafast_session_id
            ? { datafast_visitor_id, datafast_session_id }
            : {}),
          ...(dub ? { dub } : {}),
          ...(fbc ? { fbc } : {}),
          ...(fbp ? { fbp } : {}),
        }),
      })
    ).json();
  }, [tier, period]);

  const showYouTube = () => {
    modals.openModal({
      title: 'Grow Fast With Postiz (Play the video)',
      children: (
        <iframe
          className="h-full aspect-video min-w-[800px]"
          src="https://www.youtube.com/embed/BdsCVvEYgHU?si=vvhaZJ8I5oXXvVJS?autoplay=1"
          title="Postiz Tutorial"
          allow="autoplay"
          allowFullScreen
        />
      ),
    });
  };

  const { data, isLoading } = useSWR(
    embedded ? `/billing-${tier}-${period}` : null,
    loadCheckout,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  useEffect(() => {
    if (data?.blocked || blocked) {
      mutate('/user/self');
    }
  }, [data?.blocked, blocked, mutate]);

  const price = useMemo(
    () => Object.entries(pricing).filter(([key, value]) => key !== 'FREE'),
    []
  );

  const JoinOver = () => {
    return (
      <>
        <div className="text-[46px] font-[600] leading-[110%] tablet:text-[36px] mobile:!text-[30px] whitespace-pre-line text-balance">
          {t('billing_join_over', 'Join Over')}{' '}
          <span className="text-[#FC69FF]">
            {t('billing_entrepreneurs_count', '20,000+ Entrepreneurs')}
          </span>{' '}
          {t('billing_who_use', 'who use')}{' '}
          {t(
            'billing_postiz_grow_social',
            'Postiz To Grow Their Social Presence'
          )}
        </div>

        <div className="flex" onClick={showYouTube}>
          <div className="tablet:mb-[32px] cursor-pointer mt-[32px] flex gap-[10px] items-center underline hover:font-[700]">
            <div>
              <SafeImage
                className="text-[12px]"
                src="/icons/platforms/youtube.svg"
                width={22.5}
                height={16}
                alt="YouTube"
              />
            </div>
            <div>See the power of Postiz (click here)</div>
          </div>
        </div>

        {!!user?.allowTrial && (
          <div className="flex mt-[32px] mb-[10px] gap-[15px] tablet:mt-[32px] tablet:mb-[32px] text-[16px] font-[500] mobile:flex-col">
            <div className="flex gap-[8px]">
              <div>
                <CheckIconComponent />
              </div>
              <div>{t('billing_no_risk_trial', '100% No-Risk Free Trial')}</div>
            </div>
            <div className="flex-1 flex gap-[8px] justify-center mobile:justify-start">
              <div>
                <CheckIconComponent />
              </div>
              <div>
                {t(
                  'billing_pay_nothing_7_days',
                  'Pay NOTHING for the first 7-days'
                )}
              </div>
            </div>
            <div className="flex gap-[8px]">
              <div>
                <CheckIconComponent />
              </div>
              <div>
                {t('billing_cancel_anytime', 'Cancel anytime, from settings')}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="blurMe flex flex-1 flex-col bg-newBgColorInner pb-[60px] mobile:pb-[100px]">
      <div className="h-[92px] px-[80px] tablet:px-[32px] mobile:!px-[16px] py-[20px] flex border-b border-newColColor">
        <div className="flex-1 flex items-center text-textColor">
          <LogoTextComponent />
        </div>
        <div className="flex items-center">
          <div className="flex gap-[20px] text-textItemBlur">
            <OrganizationSelector />
            <InvoicesComponent />
            <div className="hover:text-newTextColor">
              <ModeComponent />
            </div>
            <div className="w-[1px] h-[20px] bg-blockSeparator" />
            <LanguageComponent />
            <div className="w-[1px] h-[20px] bg-blockSeparator" />
            <AttachToFeedbackIcon />
            <DeveloperIconComponent />
            {/*<NotificationComponent />*/}
            <div className="hover:text-newTextColor">
              {user?.tier.current === 'FREE' && (
                <LogoutComponent isIcon={true} />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex px-[80px] tablet:px-[32px] mobile:!px-[16px] flex-1 flex-row tablet:flex-none tablet:flex-col-reverse">
        <div className="flex-1 py-[40px] tablet:pt-[80px] flex flex-col pe-[40px] tablet:pe-0">
          <div className="block tablet:hidden">
            <JoinOver />
          </div>
          {data?.blocked || blocked ? (
            <div className="mt-[24px] p-[24px] rounded-[20px] border-[1.5px] border-newColColor text-[16px] font-[500]">
              {t(
                'billing_other_account_subscribed',
                'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
              )}
            </div>
          ) : !embedded ? (
            <HostedCheckout
              tier={tier}
              period={period}
              onBlocked={() => setBlocked(true)}
            />
          ) : stripeFailed ? (
            <div className="mt-[24px] p-[24px] rounded-[20px] border-[1.5px] border-newColColor text-[16px] font-[500]">
              {t(
                'billing_stripe_load_failed',
                'The payment form could not be loaded. Please disable ad blockers or privacy extensions for this page and reload.'
              )}
            </div>
          ) : !isLoading && data && stripe ? (
            <EmbeddedBilling
              stripe={stripe}
              secret={data.client_secret}
              showCoupon={period === 'MONTHLY'}
              autoApplyCoupon={data.auto_apply_coupon}
            />
          ) : (
            <LoadingComponent />
          )}
        </div>
        <div className="flex flex-col ps-[40px] tablet:!ps-[0] border-l border-newColColor py-[40px] mobile:!pt-[24px] tablet:border-none tablet:pb-0">
          <div className="top-[20px] sticky">
            <div className="hidden tablet:block">
              <JoinOver />
            </div>
            <div className="flex mb-[24px] mobile:flex-col">
              <div className="flex-1 text-[24px] font-[700]">
                {t('billing_choose_plan', 'Choose a Plan')}
              </div>
              <div className="h-[44px] px-[6px] mobile:px-0 flex items-center justify-center mobile:justify-start gap-[12px] border border-newColColor rounded-[12px] select-none">
                <div
                  className={clsx(
                    'h-[32px] mobile:flex-1 rounded-[6px] text-[16px] px-[12px] flex justify-center items-center',
                    period === 'MONTHLY'
                      ? 'bg-boxFocused text-textItemFocused'
                      : 'cursor-pointer'
                  )}
                  onClick={() => setPeriod('MONTHLY')}
                >
                  {t('billing_monthly', 'Monthly')}
                </div>
                <div
                  className={clsx(
                    'gap-[10px] h-[32px] mobile:flex-1 rounded-[6px] text-[16px] px-[12px] flex justify-center items-center',
                    period === 'YEARLY'
                      ? 'bg-boxFocused text-textItemFocused'
                      : 'cursor-pointer'
                  )}
                  onClick={() => setPeriod('YEARLY')}
                >
                  <div>{t('billing_yearly', 'Yearly')}</div>
                  <div className="bg-[#AA0FA4] text-[white] px-[8px] rounded-[4px] mobile:hidden">
                    {t('billing_20_percent_off', '20% Off')}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[8px] mobile:!grid-cols-2 tablet:grid-cols-4">
              {price.map(
                ([key, value]) => (
                  <div
                    onClick={() => setTier(key)}
                    key={key}
                    className={clsx(
                      'cursor-pointer select-none w-[266px] h-[138px] tablet:w-full tablet:h-[124px] p-[24px] tablet:p-[15px] rounded-[20px] flex flex-col',
                      key === tier
                        ? 'border-[1.5px] border-[#618DFF]'
                        : 'border-[1.5px] border-newColColor'
                    )}
                  >
                    <div className="text-[20px] mobile:text-[18px] font-[500]">
                      {capitalize(key)}
                    </div>
                    <div className="text-[24px] mobile:text-[18px] font-[400]">
                      <span className="text-[44px] mobile:text-[30px] font-[600]">
                        $
                        {
                          value[
                            period === 'MONTHLY' ? 'month_price' : 'year_price'
                          ]
                        }
                      </span>{' '}
                      {period === 'MONTHLY'
                        ? t('billing_per_month', '/ month')
                        : t('billing_per_year', '/ year')}
                    </div>
                  </div>
                ),
                []
              )}
            </div>
            <div className="flex flex-col mt-[54px] gap-[24px] tablet:mt-[40px]">
              <div className="text-[24px] font-[700]">
                {t('billing_features', 'Features')}
              </div>
              <BillingFeatures tier={tier} />
            </div>
            <div className="flex flex-col mobile:hidden tablet:hidden">
              {/*<div>asd</div>*/}
              <FAQComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Providers that host the payment page: the plan is confirmed here and the
// user is redirected to the provider's checkout to pay
const HostedCheckout: FC<{
  tier: string;
  period: string;
  onBlocked: () => void;
}> = ({ tier, period, onBlocked }) => {
  const fetch = useFetch();
  const user = useUser();
  const dub = useDubClickId();
  const toaster = useToaster();
  const track = useTrack();
  const t = useT();
  const [fbc] = useCookie('_fbc', '');
  const [fbp] = useCookie('_fbp', '');
  const [loading, setLoading] = useState(false);

  const checkout = useCallback(async () => {
    setLoading(true);
    try {
      const { url, blocked } = await (
        await fetch('/billing/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            billing: tier,
            period,
            ...(dub ? { dub } : {}),
            ...(fbc ? { fbc } : {}),
            ...(fbp ? { fbp } : {}),
          }),
        })
      ).json();

      if (url) {
        await track(TrackEnum.InitiateCheckout, {
          value:
            pricing[tier][period === 'YEARLY' ? 'year_price' : 'month_price'],
          currency: 'USD',
        });
        window.location.href = url;
        return;
      }

      if (blocked) {
        onBlocked();
        return;
      }
    } catch (err) {}

    toaster.show(
      t(
        'billing_checkout_failed',
        'We could not open the checkout, please try again'
      ),
      'warning'
    );
    setLoading(false);
  }, [tier, period, dub, fbc, fbp]);

  return (
    <div className="flex flex-col w-full pt-[48px] flex-1 tablet:pt-0">
      <h4 className="mb-[16px] text-[24px] font-[700]">
        {t('billing_order_summary', 'Order Summary')}
      </h4>
      <div className="rounded-[12px] border border-newColColor p-[20px] flex flex-col gap-[12px]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-[600] text-textColor">
              {capitalize(tier)}
            </span>
            <span className="text-[13px] text-textColor/60">
              {period === 'MONTHLY'
                ? t('billing_monthly', 'Monthly')
                : t('billing_yearly', 'Yearly')}
            </span>
          </div>
          <span className="font-[500] text-textColor">
            ${pricing[tier][period === 'MONTHLY' ? 'month_price' : 'year_price']}
          </span>
        </div>
        <div className="text-[12px]">
          <strong>
            {t(
              'billing_cancel_notice',
              'Cancel anytime from settings without talking to a person and never be charged.'
            )}
          </strong>
        </div>
      </div>
      <Button
        className="mt-[24px] h-[42px] rounded-[10px] self-start mobile:w-full"
        loading={loading}
        onClick={checkout}
      >
        {user?.allowTrial
          ? t('billing_pay_0_start_trial', 'Pay $0 Today - Start your free trial!')
          : t('billing_continue_to_checkout', 'Continue to checkout')}
      </Button>
      <div className="mt-[16px] text-[14px] text-textItemBlur">
        {t(
          'billing_hosted_checkout_notice',
          "You'll complete your payment on our payment partner's secure checkout page."
        )}
      </div>
    </div>
  );
};

type FeatureItem = {
  key: string;
  defaultValue: string;
  prefix?: string | number;
};

export const useBillingFeatures = (tier: string) => {
  const t = useT();
  const features = useMemo(() => {
    const currentPricing = pricing[tier];
    const channelsOr = currentPricing.channel;
    const list: FeatureItem[] = [];

    list.push({
      key: channelsOr === 1 ? 'billing_channel' : 'billing_channels',
      defaultValue: channelsOr === 1 ? 'channel' : 'channels',
      prefix: channelsOr,
    });

    list.push({
      key: 'billing_posts_per_month',
      defaultValue: 'posts per month',
      prefix:
        currentPricing.posts_per_month > 10000
          ? 'unlimited'
          : currentPricing.posts_per_month,
    });

    if (currentPricing.team_members) {
      list.push({
        key: 'billing_unlimited_team_members',
        defaultValue: 'Unlimited team members',
      });
    }
    if (currentPricing?.ai) {
      list.push({
        key: 'billing_ai_auto_complete',
        defaultValue: 'AI auto-complete',
      });
      list.push({ key: 'billing_ai_copilots', defaultValue: 'AI copilots' });
      list.push({
        key: 'billing_ai_autocomplete',
        defaultValue: 'AI Autocomplete',
      });
    }
    list.push({
      key: 'billing_advanced_picture_editor',
      defaultValue: 'Advanced Picture Editor',
    });
    if (currentPricing?.image_generator) {
      list.push({
        key: 'billing_ai_images_per_month',
        defaultValue: 'AI Images per month',
        prefix: currentPricing?.image_generation_count,
      });
    }
    if (currentPricing?.generate_videos) {
      list.push({
        key: 'billing_ai_videos_per_month',
        defaultValue: 'AI Videos per month',
        prefix: currentPricing?.generate_videos,
      });
    }
    if (currentPricing?.clipping_minutes) {
      list.push({
        key: 'billing_clipping_minutes_per_month',
        defaultValue: 'minutes of AI video clipping per month',
        prefix: currentPricing?.clipping_minutes,
      });
    }
    return list;
  }, [tier]);

  const renderFeature = (feature: FeatureItem) => {
    const translatedText = t(feature.key, feature.defaultValue);
    if (feature.prefix === 'unlimited') {
      return `${t('billing_unlimited', 'Unlimited')} ${translatedText}`;
    }
    if (feature.prefix !== undefined) {
      return `${feature.prefix} ${translatedText}`;
    }
    return translatedText;
  };

  return features.map((feature) => ({
    key: feature.key,
    label: renderFeature(feature),
  }));
};

export const BillingFeatures: FC<{ tier: string }> = ({ tier }) => {
  const features = useBillingFeatures(tier);

  return (
    <div className="grid grid-cols-2 mobile:grid-cols-1 gap-y-[8px] gap-x-[32px]">
      {features.map((feature) => (
        <div key={feature.key} className="flex items-center gap-[8px]">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
            >
              <path
                d="M11.825 0H4.84167C1.80833 0 0 1.80833 0 4.84167V11.8167C0 14.8583 1.80833 16.6667 4.84167 16.6667H11.8167C14.85 16.6667 16.6583 14.8583 16.6583 11.825V4.84167C16.6667 1.80833 14.8583 0 11.825 0ZM12.3167 6.41667L7.59167 11.1417C7.475 11.2583 7.31667 11.325 7.15 11.325C6.98333 11.325 6.825 11.2583 6.70833 11.1417L4.35 8.78333C4.10833 8.54167 4.10833 8.14167 4.35 7.9C4.59167 7.65833 4.99167 7.65833 5.23333 7.9L7.15 9.81667L11.4333 5.53333C11.675 5.29167 12.075 5.29167 12.3167 5.53333C12.5583 5.775 12.5583 6.16667 12.3167 6.41667Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>{feature.label}</div>
        </div>
      ))}
    </div>
  );
};
