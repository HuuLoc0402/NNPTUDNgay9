var express = require("express");
var router = express.Router();
const path = require('path');
const importUsersController = require('../controllers/importUsers');
const roleModel = require('../schemas/roles');

// POST /api/v1/import/users
// Body: { filePath: "uploads/user.xlsx", roleName: "user" }
router.post('/users', async (req, res, next) => {
    try {
        const { filePath = 'uploads/user.xlsx', roleName = 'user' } = req.body;
        
        // Find role by name
        const role = await roleModel.findOne({ name: roleName, isDeleted: false });
        if (!role) {
            return res.status(400).json({
                success: false,
                message: `Role "${roleName}" not found. Please create role first.`
            });
        }

        // Import users from Excel file
        const result = await importUsersController.importUsersFromExcel(filePath, role._id);
        
        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
