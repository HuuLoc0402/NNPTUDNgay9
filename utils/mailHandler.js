const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "2995303f0f7c63",
    pass: "a456140d88cf43"
  }
});
module.exports = {
    sendMail: async function (to,url) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "reset password URL",
            text: "click vao day de doi pass", // Plain-text version of the message
            html: "click vao <a href="+url+">day</a> de doi pass", // HTML version of the message
        });

        console.log("Message sent:", info.messageId);
    },
    
    sendPasswordEmail: async function (to, username, password) {
        try {
            const info = await transporter.sendMail({
                from: 'hehehe@gmail.com',
                to: to,
                subject: "Mật khẩu tài khoản của bạn",
                text: `Tài khoản: ${username}\nMật khẩu: ${password}\n\nVui lòng đổi mật khẩu sau khi đăng nhập lần đầu.`,
                html: `<h2>Mật khẩu tài khoản của bạn</h2>
                       <p><strong>Tài khoản:</strong> ${username}</p>
                       <p><strong>Mật khẩu:</strong> <code style="background-color: #f4f4f4; padding: 2px 5px;">${password}</code></p>
                       <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>`,
            });
            console.log("Password email sent to:", to, "- Message ID:", info.messageId);
            return true;
        } catch (error) {
            console.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }
}
