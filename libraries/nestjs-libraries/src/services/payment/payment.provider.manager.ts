import { HttpException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  PaymentPlatform,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';

@Injectable()
export class PaymentProviderManager {
  constructor(private _moduleRef: ModuleRef) {}

  private metadata(): { target: any; provider: string }[] {
    return (
      Reflect.getMetadata('payment-provider', PaymentProviderAbstract) || []
    );
  }

  getProvider(provider: string): PaymentProviderAbstract {
    const found = this.metadata().find((m) => m.provider === provider);

    if (!found) {
      throw new HttpException(`Payment provider ${provider} not found`, 400);
    }

    return this._moduleRef.get(found.target, { strict: false });
  }

  getProviders(): { name: string; provider: PaymentProviderAbstract }[] {
    return this.metadata().map((m) => ({
      name: m.provider,
      provider: this._moduleRef.get(m.target, { strict: false }),
    }));
  }

  // The provider new subscriptions use: PAYMENT_PROVIDER when it is one of the
  // platform's providers, otherwise the first registered one
  getDefaultProvider(platform: PaymentPlatform) {
    const providers = this.getProviders().filter(
      (p) => p.provider.platform === platform
    );
    const found =
      providers.find((p) => p.name === process.env.PAYMENT_PROVIDER) ||
      providers[0];

    if (!found) {
      throw new Error(`No payment provider registered for ${platform}`);
    }

    return found;
  }
}
