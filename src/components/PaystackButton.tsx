import React from "react";
import { PaystackButton } from "react-paystack";

type PaystackProps = {
  email: string;
  amount: number; // in ZAR cents
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  metadata?: Record<string, any>; // Additional metadata for Paystack
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

  const componentProps = {
    email,
    amount,
    currency: "ZAR",
    reference,
    publicKey,
    text: "Pay Now",
    onSuccess: () => onSuccess(reference),
    onClose,
    metadata: metadata || {},
    className: "bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-lg w-full hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl",
  };

  return <PaystackButton {...componentProps} />;
};

export default PaystackPaymentButton; 