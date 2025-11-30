import React from "react";
import { PaystackButton } from "react-paystack";

type PaystackMetadata = {
  custom_fields: Array<{
    display_name: string;
    variable_name: string;
    value: string | number;
  }>;
  [key: string]: string | number | boolean | Array<Record<string, string | number>> | undefined;
};

type PaystackProps = {
  email: string;
  amount: number; // in ZAR cents
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  metadata?: PaystackMetadata; // Additional metadata for Paystack
};

const PaystackPaymentButton: React.FC<PaystackProps> = ({
  email,
  amount,
  reference,
  onSuccess,
  onClose,
  metadata,
}) => {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY!;
  console.log(publicKey)

  // Ensure metadata has the required structure for Paystack
  const paystackMetadata = metadata ? {
    ...metadata,
    custom_fields: metadata.custom_fields || [],
  } : undefined;

  const componentProps = {
    email,
    amount,
    currency: "ZAR",
    reference,
    publicKey,
    text: "Pay Now",
    onSuccess: () => onSuccess(reference),
    onClose,
    ...(paystackMetadata && { metadata: paystackMetadata }),
    className: "bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-lg w-full hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl",
  };

  return <PaystackButton {...componentProps} />;
};

export default PaystackPaymentButton; 