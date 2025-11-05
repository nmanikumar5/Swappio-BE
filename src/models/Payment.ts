import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    userId: mongoose.Types.ObjectId;
    listingId?: mongoose.Types.ObjectId;

    // Payment Details
    amount: number;
    currency: string;

    // Gateway Info
    gateway: "razorpay" | "stripe" | "paypal";
    gatewayTransactionId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;

    // Payment Type
    type: "listing_priority" | "ad_credits" | "subscription" | "additional_ad";
    description: string;

    // Status
    status: "pending" | "success" | "failed" | "refunded";
    paymentMethod: string;

    // Priority purchased (if applicable)
    priorityLevel?: "featured" | "premium" | "platinum";
    priorityDuration?: number;

    // Credits purchased (if applicable)
    creditsPurchased?: number;

    // Timestamps
    paidAt?: Date;
    refundedAt?: Date;

    // Metadata
    metadata: Record<string, any>;
    receiptUrl?: string;
    invoiceNumber?: string;
}

const PaymentSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        listingId: {
            type: Schema.Types.ObjectId,
            ref: "Listing",
            index: true,
        },

        // Payment Details
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            default: "INR",
            uppercase: true,
        },

        // Gateway Info
        gateway: {
            type: String,
            required: true,
            enum: ["razorpay", "stripe", "paypal"],
        },
        gatewayTransactionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        gatewayOrderId: {
            type: String,
            required: true,
            index: true,
        },
        gatewayPaymentId: {
            type: String,
            index: true,
        },

        // Payment Type
        type: {
            type: String,
            required: true,
            enum: ["listing_priority", "ad_credits", "subscription", "additional_ad"],
            index: true,
        },
        description: {
            type: String,
            required: true,
        },

        // Status
        status: {
            type: String,
            required: true,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending",
            index: true,
        },
        paymentMethod: {
            type: String,
            enum: ["upi", "card", "netbanking", "wallet", "other"],
        },

        // Priority purchased (if applicable)
        priorityLevel: {
            type: String,
            enum: ["featured", "premium", "platinum"],
        },
        priorityDuration: {
            type: Number,
            min: 1,
        },

        // Credits purchased (if applicable)
        creditsPurchased: {
            type: Number,
            min: 1,
        },

        // Timestamps
        paidAt: Date,
        refundedAt: Date,

        // Metadata
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        receiptUrl: String,
        invoiceNumber: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ gateway: 1, status: 1 });

// Generate invoice number before save
PaymentSchema.pre("save", async function (next) {
    if (this.isNew && this.status === "success" && !this.invoiceNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const count = await mongoose.model("Payment").countDocuments();
        this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(6, "0")}`;
    }
    next();
});

export default mongoose.model<IPayment>("Payment", PaymentSchema);
