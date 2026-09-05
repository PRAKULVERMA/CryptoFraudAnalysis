const users = new Map();

export class UserRepository {
  async findByEmail(email) {
    return users.get(email) || null;
  }

  async createUser(user) {
    users.set(user.email, user);
    return user;
  }
}

export default new UserRepository();
