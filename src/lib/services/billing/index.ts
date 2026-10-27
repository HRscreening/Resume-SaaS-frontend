import IBillingProvider from "./providers/IBillingProvider";
import RazorpayProvider from "./providers/razorpay";
import PaypalProvider from "./providers/paypal/paypal";
import { PaymentProvider, type PaymentProviderType } from "@/types/subscription.type"

function getBillingProvider(providerName: PaymentProviderType): IBillingProvider {
    switch (providerName) {
        case PaymentProvider.RAZORPAY:
            return new RazorpayProvider();

        case PaymentProvider.PAYPAL: {
            const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
            if (!clientId) {throw new Error("NEXT_PUBLIC_PAYPAL_CLIENT_ID is not configured");}
            return new PaypalProvider(clientId);
        }

        default:
            throw new Error(`Unsupported billing provider: ${providerName}`);
    }
}

export { type IBillingProvider, getBillingProvider };