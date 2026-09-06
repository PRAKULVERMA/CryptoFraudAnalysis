import { getMongooseConnection } from '../config/mongodb.js';
import Investigation from '../models/Investigation.js';

function toPlain(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return obj;
}

export class InvestigationRepository {
  async createInvestigation(record) {
    await getMongooseConnection();
    const doc = new Investigation(record);
    await doc.save();
    return toPlain(doc);
  }

  async getInvestigation(id) {
    await getMongooseConnection();
    const doc = await Investigation.findOne({ investigation_id: id });
    return doc ? toPlain(doc) : null;
  }

  async listInvestigations(userId) {
    await getMongooseConnection();
    const query = {};
    if (userId !== undefined && userId !== null && userId !== '') {
      query.user_id = userId;
    }
    const docs = await Investigation.find(query).sort({ created_at: -1 });
    return docs.map(toPlain);
  }

  async updateInvestigation(id, updates) {
    await getMongooseConnection();
    const doc = await Investigation.findOneAndUpdate(
      { investigation_id: id },
      { $set: updates },
      { new: true }
    );
    return doc ? toPlain(doc) : null;
  }

  async deleteInvestigation(id) {
    await getMongooseConnection();
    const result = await Investigation.deleteOne({ investigation_id: id });
    return result.deletedCount > 0;
  }

  async claimInvestigation(id) {
    await getMongooseConnection();
    const doc = await Investigation.findOneAndUpdate(
      { investigation_id: id, status: 'queued' },
      {
        $set: {
          status: 'running',
          started_at: new Date(),
        },
      },
      { new: true }
    );
    return doc ? toPlain(doc) : null;
  }

  async findStaleRunning(staleThreshold) {
    await getMongooseConnection();
    const threshold = new Date(Date.now() - staleThreshold);
    const docs = await Investigation.find({
      status: { $in: ['running', 'retrying'] },
      updated_at: { $lt: threshold },
    });
    return docs.map(toPlain);
  }

  async findRetryableFailed(maxRetries) {
    await getMongooseConnection();
    const docs = await Investigation.find({
      status: 'failed',
      retry_count: { $lt: maxRetries },
    });
    return docs.map(toPlain);
  }
}

export default new InvestigationRepository();
