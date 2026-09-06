import mongoose from 'mongoose';

const investigationSchema = new mongoose.Schema(
  {
    investigation_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      index: true,
    },
    wallet_address: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: 'PENDING',
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
    },
    current_step: {
      type: String,
      required: true,
      default: 'VALIDATING WALLET',
    },
    completed_at: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    synthetic: {
      type: Boolean,
      required: true,
      default: false,
    },
    mode: {
      type: String,
      required: true,
      default: 'DEMO',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.investigation_id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

investigationSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model('Investigation', investigationSchema);
