const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const path = require('path');
const userModel = require('../schemas/users');
const roleModel = require('../schemas/roles');
const { sendPasswordEmail } = require('../utils/mailHandler');

// Generate random password - 16 characters
const generateRandomPassword = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Read Excel file and extract users
const readUsersFromExcel = async (filePath) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        const users = [];
        
        console.log('📖 Total rows in Excel:', worksheet.rowCount);
        
        // Process all rows (starting from row 2, skip header)
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            let username = row.getCell(1).value;
            let email = row.getCell(2).value;
            
            // Handle Excel object values
            if (typeof email === 'object' && email !== null) {
                email = email.text || email.richText || email.result || email.toString();
            }
            
            if (typeof username === 'object' && username !== null) {
                username = username.text || username.richText || username.result || username.toString();
            }
            
            // Convert to string and trim
            username = String(username).trim();
            email = String(email).trim();
            
            console.log(`Row ${rowNumber}: username=${username}, email=${email}`);
            
            // Skip if either is empty or is [object Object]
            if (!username || !email || email.includes('[object')) {
                continue;
            }
            
            // Validate email format
            if (email.includes('@')) {
                users.push({
                    username: username,
                    email: email
                });
            }
        }
        
        console.log(`✅ Found ${users.length} valid users`);
        return users;
    } catch (error) {
        throw new Error(`Failed to read Excel file: ${error.message}`);
    }
};

module.exports = {
    importUsersFromExcel: async function (excelFilePath, roleId) {
        try {
            // Validate role exists
            const role = await roleModel.findById(roleId);
            if (!role) {
                return {
                    success: false,
                    message: 'Role not found'
                };
            }

            // Read users from Excel
            const users = await readUsersFromExcel(excelFilePath);
            
            if (users.length === 0) {
                return {
                    success: false,
                    message: 'No valid users found in Excel file'
                };
            }

            const results = {
                success: [],
                failed: []
            };

            // Process each user
            for (const userData of users) {
                try {
                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(userData.email)) {
                        results.failed.push({
                            username: userData.username,
                            email: userData.email,
                            reason: 'Invalid email format'
                        });
                        continue;
                    }

                    // Check if user already exists
                    const existingUser = await userModel.findOne({
                        $or: [
                            { username: userData.username },
                            { email: userData.email }
                        ],
                        isDeleted: false
                    });

                    if (existingUser) {
                        results.failed.push({
                            username: userData.username,
                            email: userData.email,
                            reason: 'Username or email already exists'
                        });
                        continue;
                    }

                    // Generate random password (16 characters)
                    const randomPassword = generateRandomPassword(16);

                    // Create new user (password will be hashed by userSchema.pre('save'))
                    const newUser = new userModel({
                        username: userData.username,
                        email: userData.email,
                        password: randomPassword,
                        role: roleId,
                        status: false,
                        loginCount: 0
                    });

                    await newUser.save();

                    // Send password email
                    try {
                        await sendPasswordEmail(
                            userData.email,
                            userData.username,
                            randomPassword
                        );
                        
                        results.success.push({
                            username: userData.username,
                            email: userData.email,
                            message: 'User created and email sent successfully'
                        });
                    } catch (emailError) {
                        results.success.push({
                            username: userData.username,
                            email: userData.email,
                            message: 'User created but failed to send email',
                            emailError: emailError.message
                        });
                    }

                } catch (error) {
                    results.failed.push({
                        username: userData.username,
                        email: userData.email,
                        reason: error.message
                    });
                }
            }

            return {
                success: true,
                summary: {
                    total: users.length,
                    successCount: results.success.length,
                    failedCount: results.failed.length
                },
                details: results
            };

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
};
