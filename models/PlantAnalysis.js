const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const PlantAnalysis = sequelize.define("PlantAnalysis", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  imagePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  analysisResult: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

User.hasMany(PlantAnalysis, { foreignKey: "userId", onDelete: "CASCADE" });
PlantAnalysis.belongsTo(User, { foreignKey: "userId" });

module.exports = PlantAnalysis;
