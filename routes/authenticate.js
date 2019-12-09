const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/userRegistration');
const { check, validationResult } = require('express-validator');

router.post('/signup', [
    check('email').isEmail(),
    check('password').isLength({ min: 5 })],

    function (req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (errors.errors[0].param == "email") {
                return res.json({ status: 422, message: "Invalid email address" });
            } else {
                return res.json({
                    status: 422,
                    message: "Invalid password, password length must be greater than 5."
                });
            }
        }
        next();
    },

    function (req, res, next) {
        User.findOne({ email: req.body.email }, function (err, user) {
            if (err) return res.json({ status: 500, message: "Internal server error", err: err });
            else if (user) {
                return res.json({ status: 415, message: "email already exits" });
            }
            else next();
        });

    },

    function (req, res, next) {
        User.findOne({ userName: req.body.userName }, function (err, user) {
            if (err) return res.json({ status: 500, message: "Internal server error", err: err });
            else if (user) {
                return res.json({ status: 415, message: "user name already exits" });
            }
            else next();
        });

    },

    function (req, res, next) {
        const password = req.body.password;
        const cPassword = req.body.cpassword;
        if (password === cPassword) { next(); }
        else {
            return res.json({ status: 415, message: "password dint match" });
        }
    },

    function (req, res, next) {
        const userName = req.body.userName;
        const email = req.body.email;
        const phoneNumber = req.body.phone;
        const password = req.body.password;
        const gender = req.body.gender;
        const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = new User({ userName: userName, email: email, phoneNumber: phoneNumber, password: password, emailOTP: emailOTP, isVerfied: false, gender: gender });

        newUser.save(function (err, user) {
            if (err) return res.json({ status: 500, message: "internal server error", err: err });
            else {
                let token = jwt.sign({ id: user._id }, 'blogsuser', { expiresIn: 180 });
                return res.json({ status: 200, message: "User created", token: token });
            }
        });

    }
);

router.post('/login',
    function (req, res, next) {
        const userName = req.body.userName;
        const password = req.body.password;
        User.findOne({ userName: userName }, function (err, user) {
            if (err) {
                return res.json({ status: 500, message: "internal server error", err: err });
            }
            else if (!user) {
                return res.json({ status: 422, message: "user name not found" });
            }
            else if (user) {
                next();
            }

        })

    },
    function (req, res, next) {
        const userName = req.body.userName;
        User.findOne({ userName: userName }, function (err, user) {

            if (err) {
                return res.json({ status: 500, message: "internal server error", err: err });
            }
            else if (user) {
                if (user.isVerified == true) { next(); }
                else {
                    return res.json({ status: 415, message: "user not verified" });
                }
            }
        })

    },

    function (req, res, next) {
        const userName = req.body.userName;
        const password = req.body.password;
        User.findOne({ userName: userName }, function (err, user) {
            if (err) {
                return res.json({ status: 500, message: "internal server error", err: err });
            }
            else if (user) {
                if (user.password === password) {
                    const token = jwt.sign({ id: user._id }, 'blogsuser', { expiresIn: 180 });
                    return res.json({ status: 200, message: "User sucessfully loggedin", token: token });
                }
                else if (user.password !== password) {
                    return res.json({ status: 422, message: "wrong password" });
                }
            }
        })
    }
);

router.post('/verify', verifyToken, function (req, res, next) {
    const id = req.userId;
    User.findById(id, function (err, user) {
        if (err) {
            return res.json({ status: 500, message: "internal server error", err: err });
        }
        else if (!user) {
            return res.json({ status: 422, message: "user not found" });
        }
        else if (user.isVerfied == true) {
            return res.json({ status: 415, message: "user already verified" });
        }
        else {
            otp = req.body.otp;
            if (user.emailOTP == otp) {
                user.isVerified = true;
                user.save();
                return res.json({ status: 200, message: "user verified sucessfully" });
            }
            else {
                return res.json({ status: 422, message: "invalid otp" });
            }
        }
    })

});

router.get('/getUserState', verifyToken, function (req, res, next) {
    const id = req.userId;
    User.findById(id, function (err, user) {
        if (err) {
            return res.json({ status: 500, message: "internal server error", err: err });
        }
        else if (!user) {
            return res.json({ status: 422, message: "user not found" });
        }
        else if (user.isVerfied == true) {
            return res.json({ status: 200, message: "token authenticated,user  verified" });
        }
        else if (user.isVerfied == false) {
            return res.json({ status: 415, message: "token authenticated,user not verified" });
        }

    })
});



function verifyToken(req, res, next) {
    const token = req.headers['access-token'];
    if (!token) {
        return res.json({ status: 422, message: "no token found" });
    }
    else {
        jwt.verify(token, 'blogsuser', function (err, decoded) {
            if (err) {
                return res.json({ status: 500, message: "internal server error", err: err });
            }
            else {
                req.userId = decoded.id;
                next();
            }

        })
    }
}
module.exports = router;