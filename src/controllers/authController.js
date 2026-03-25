const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const {
    createUser,
    findUserByEmail,
    findUserByEmailOrUsername,
    findUserByGoogleId,
    findUserByUsername,
    linkGoogleAccount
} = require("../models/authModel");

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function buildTokenPayload(user) {
    return {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role
    };
}

function signToken(user) {
    return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
        expiresIn: "1d"
    });
}

async function register(req, res) {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ message: "Email, username, and password are required." });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedUsername = String(username).trim();

        if (!normalizedEmail || !normalizedUsername || String(password).trim().length < 6) {
            return res.status(400).json({
                message: "Provide a valid email, username, and a password with at least 6 characters."
            });
        }

        const existingEmail = await findUserByEmail(normalizedEmail);
        if (existingEmail) {
            return res.status(409).json({ message: "Email is already registered." });
        }

        const existingUsername = await findUserByUsername(normalizedUsername);
        if (existingUsername) {
            return res.status(409).json({ message: "Username is already taken." });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await createUser({
            email: normalizedEmail,
            username: normalizedUsername,
            passwordHash
        });

        const token = signToken(user);

        return res.status(201).json({
            message: "User registered successfully.",
            token,
            user
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to register user." });
    }
}

async function login(req, res) {
    try {
        const { identifier, email, username, password } = req.body;
        const lookupValue = String(identifier || email || username || "").trim();

        if (!lookupValue || !password) {
            return res.status(400).json({ message: "Identifier and password are required." });
        }

        const user = await findUserByEmailOrUsername(lookupValue.toLowerCase());

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        if (!user.password_hash) {
            return res.status(401).json({ message: "This account uses Google login." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const token = signToken(user);

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: buildTokenPayload(user)
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to login." });
    }
}

function sanitizeUsername(input) {
    return String(input || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50);
}

async function generateUniqueUsername(seed) {
    const base = sanitizeUsername(seed) || `user_${Date.now()}`;
    let candidate = base;
    let suffix = 1;

    while (await findUserByUsername(candidate)) {
        const suffixText = `_${suffix}`;
        candidate = `${base.slice(0, Math.max(1, 50 - suffixText.length))}${suffixText}`;
        suffix += 1;
    }

    return candidate;
}

async function loginWithGoogle(req, res) {
    try {
        const { idToken } = req.body;

        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ message: "Google login is not configured." });
        }

        if (!idToken) {
            return res.status(400).json({ message: "Google idToken is required." });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email) {
            return res.status(401).json({ message: "Invalid Google token." });
        }

        let user = await findUserByGoogleId(payload.sub);

        if (!user) {
            user = await findUserByEmail(payload.email.toLowerCase());
        }

        if (user && !user.google_id) {
            user = await linkGoogleAccount({
                userId: user.id,
                googleId: payload.sub
            });
        }

        if (!user) {
            const username = await generateUniqueUsername(payload.name || payload.email.split("@")[0]);
            user = await createUser({
                email: payload.email.toLowerCase(),
                username,
                googleId: payload.sub
            });
        }

        const token = signToken(user);

        return res.status(200).json({
            message: "Google login successful.",
            token,
            user: buildTokenPayload(user)
        });
    } catch (error) {
        return res.status(401).json({ message: "Google authentication failed." });
    }
}

function logout(req, res) {
    return res.status(200).json({
        message: "Logout successful. Remove the token on the client side."
    });
}

function me(req, res) {
    return res.status(200).json({ user: req.user });
}

module.exports = {
    login,
    loginWithGoogle,
    logout,
    me,
    register
};
