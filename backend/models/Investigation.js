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
      default: 'queued',
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
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    failed_at: {
      type: Date,
      default: null,
    },
    retry_count: {
      type: Number,
      required: true,
      default: 0,
    },
    max_retries: {
      type: Number,
      required: true,
      default: 3,
    },
    last_error: {
      type: mongoose.Schema.Types.Mixed,
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
        delete ret._id;
        delete ret.__v;
        for (const key of Object.keys(ret)) {
          if (ret[key] instanceof Date) {
            ret[key] = ret[key].toISOString();
          }
        }
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        for (const key of Object.keys(ret)) {
          if (ret[key] instanceof Date) {
            ret[key] = ret[key].toISOString();
          }
        }
        return ret;
      },
    },
  }
);

investigationSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model('Investigation', investigationSchema);
