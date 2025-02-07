const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true, // Ensure proper email format
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Users must verify their email
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true, // Stores token until email verification
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true, // Stores token for password reset
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true, // Expiry time for reset token
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Default: normal users (admins must be assigned manually)
  },
}, {
  hooks: {
    // Hash password before saving a new user
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hash password before updating if changed
    beforeUpdate: async (user) => {
      if (user.changed("password")) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

module.exports = User;
