import mongoose from 'mongoose';

const privacyPolicySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    default: ''
  },
  termsOfUse: {
    type: String,
    default: ''
  },
  termsLastUpdatedAt: {
    type: Date,
    default: null
  },
  termsLastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

const migrateLegacyBrandText = (value) => {
  if (typeof value !== 'string') return value;

  return value
    .replace(/@(wafa[.](ma|com)|atlas-qcm[.]online)/gi, '@YourQcm.online')
    .replace(/atlas\s*qcm/gi, 'YourQcm')
    .replace(/\bwafa\b/gi, 'YourQcm');
};

// Ensure only one document exists
privacyPolicySchema.statics.getPolicy = async function() {
  let policy = await this.findOne();
  if (!policy) {
    policy = await this.create({ content: '' });
    return policy;
  }

  const content = migrateLegacyBrandText(policy.content);
  const termsOfUse = migrateLegacyBrandText(policy.termsOfUse);

  if (content !== policy.content || termsOfUse !== policy.termsOfUse) {
    policy.content = content;
    policy.termsOfUse = termsOfUse;
    await policy.save();
  }

  return policy;
};

const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);

export default PrivacyPolicy;
