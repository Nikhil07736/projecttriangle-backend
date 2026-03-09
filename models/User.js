const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Points to your mysql2 connection

const User = sequelize.define('User', {
    name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
    },
    password: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    role: { 
        type: DataTypes.STRING, 
        defaultValue: 'user' 
    },
    is_verified: { 
        type: DataTypes.TINYINT, 
        defaultValue: 0 
    },
    otp: { 
        type: DataTypes.STRING 
    },
    otp_expires: { 
        type: DataTypes.DATE 
    }
}, {
    tableName: 'users', // Matches your Workbench table name exactly
    timestamps: false   // Your dump shows created_at is handled by MySQL
});

module.exports = User;