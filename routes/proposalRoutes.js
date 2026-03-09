const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });


// --- ROUTES ---

// GET all proposals for a specific project
router.get("/:projectId", protect, (req, res) => {
    const { projectId } = req.params;
    const projectSql = "SELECT * FROM projects WHERE id = ?";
    db.query(projectSql, [projectId], (err, projectResults) => {
        if (err || projectResults.length === 0) {
            return res.status(404).json({ error: "Project not found." });
        }
        const project = projectResults[0];
        const proposalsSql = `
            SELECT p.*, u.name as freelancer_name 
            FROM proposals p 
            JOIN users u ON p.freelancer_id = u.id 
            WHERE p.project_id = ?
        `;
        db.query(proposalsSql, [projectId], (err, proposalResults) => {
            if (err) return res.status(500).json({ error: "Database error fetching proposals." });
            res.json({ project: project, proposals: proposalResults });
        });
    });
});

// Freelancer SUBMITS a proposal and notifies the client
router.post("/:projectId", protect, upload.single("attachment"), (req, res) => {
    const { projectId } = req.params;
    const freelancer_id = req.user.id;
    const freelancer_name = req.user.name;
    const { cover_letter, proposed_budget } = req.body;
    const attachment = req.file ? req.file.filename : null;

    if (!cover_letter || !proposed_budget) {
        return res.status(400).json({ error: "Cover letter and budget are required." });
    }

    const sql = `INSERT INTO proposals (project_id, freelancer_id, cover_letter, proposed_budget, attachment_path, status) VALUES (?, ?, ?, ?, ?, 'pending')`;
    const values = [projectId, freelancer_id, cover_letter, proposed_budget, attachment];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: "Database error while submitting proposal." });

        const newProposalId = result.insertId;
        const getProjectInfoSql = "SELECT user_id, title FROM projects WHERE id = ?";
        db.query(getProjectInfoSql, [projectId], (projectErr, projectResults) => {
            if (projectErr || projectResults.length === 0) {
                return res.json({ message: "Proposal submitted but failed to create notification." });
            }
            const { user_id: projectOwnerId, title: projectTitle } = projectResults[0];

            if (projectOwnerId === freelancer_id) {
                return res.json({ message: "Proposal submitted successfully!" });
            }

            const notificationMessage = `${freelancer_name} submitted a proposal for your project "${projectTitle}".`;
            const notificationLink = `/jobs/${projectId}/proposals`;
            const notificationSql = `
                INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                VALUES (?, ?, 'new_proposal', ?, ?)
            `;
            db.query(notificationSql, [projectOwnerId, freelancer_id, notificationMessage, notificationLink]);
            
            res.status(201).json({ message: "Proposal submitted successfully!", proposalId: newProposalId });
        });
    });
});

// Client ACCEPTS a proposal and notifies the freelancer
router.put('/:proposalId/accept', protect, (req, res) => {
    const { proposalId } = req.params;
    const { razorpay_payment_id } = req.body;
    const client_id = req.user.id;
    const client_name = req.user.name;

    const updateProposalSql = "UPDATE proposals SET status = 'accepted' WHERE id = ?";
    db.query(updateProposalSql, [proposalId], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB error updating proposal status.' });

        const getDetailsSql = `
            SELECT p.project_id, p.proposed_budget, p.freelancer_id, j.title as project_title 
            FROM proposals p JOIN projects j ON p.project_id = j.id
            WHERE p.id = ?
        `;
        db.query(getDetailsSql, [proposalId], (err, details) => {
            if (err || details.length === 0) return res.status(500).json({ error: 'Could not get proposal details.' });

            const { project_id, proposed_budget, freelancer_id, project_title } = details[0];
            const createContractSql = `INSERT INTO contracts (job_id, client_id, freelancer_id, proposal_id, amount, razorpay_payment_id, contract_status) VALUES (?, ?, ?, ?, ?, ?, 'active')`;
            const values = [project_id, client_id, freelancer_id, proposalId, proposed_budget, razorpay_payment_id];

            db.query(createContractSql, values, (err, contractResult) => {
                if (err) return res.status(500).json({ error: 'DB error creating contract.' });

                const createConversationSql = 'INSERT INTO conversations (proposal_id) VALUES (?)';
                db.query(createConversationSql, [proposalId], (convErr, convResult) => {
                    if (convErr) return;
                    const conversationId = convResult.insertId;
                    const participantsSql = 'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)';
                    db.query(participantsSql, [conversationId, client_id, conversationId, freelancer_id]);
                });
                
                const notificationMessage = `Great news! ${client_name} accepted your proposal for "${project_title}".`;
                const notificationLink = `/jobs/${project_id}/proposals`;
                const notificationSql = `
                    INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                    VALUES (?, ?, 'proposal_accepted', ?, ?)
                `;
                db.query(notificationSql, [freelancer_id, client_id, notificationMessage, notificationLink], (notificationErr) => {
                    if (notificationErr) {
                        console.error("Error creating 'proposal accepted' notification:", notificationErr);
                    }
                    // ✨ FIX: Response is now sent AFTER notification query finishes.
                    res.json({ status: 'success', message: 'Proposal accepted and contract created.' });
                });
            });
        });
    });
});

// Client REJECTS a proposal and notifies the freelancer
router.put('/:proposalId/reject', protect, (req, res) => {
    const { proposalId } = req.params;
    const projectOwnerId = req.user.id;
    const projectOwnerName = req.user.name;

    const getProposalSql = `
        SELECT p.freelancer_id, p.project_id, j.user_id as project_owner_id, j.title as project_title
        FROM proposals p JOIN projects j ON p.project_id = j.id
        WHERE p.id = ?
    `;
    db.query(getProposalSql, [proposalId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Proposal not found.' });
        
        const proposal = results[0];
        if (proposal.project_owner_id !== projectOwnerId) {
            return res.status(403).json({ error: 'You are not authorized to perform this action.' });
        }

        const updateStatusSql = "UPDATE proposals SET status = 'rejected' WHERE id = ?";
        db.query(updateStatusSql, [proposalId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Failed to update proposal status.' });

            const notificationMessage = `Your proposal for "${proposal.project_title}" was declined by ${projectOwnerName}.`;
            const notificationLink = `/jobs/${proposal.project_id}/proposals`;
            const notificationSql = `
                INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                VALUES (?, ?, 'proposal_rejected', ?, ?)
            `;
            db.query(notificationSql, [proposal.freelancer_id, projectOwnerId, notificationMessage, notificationLink], (notificationErr) => {
                if (notificationErr) {
                    console.error("Error creating 'proposal rejected' notification:", notificationErr);
                }
                // ✨ FIX: Response is now sent AFTER notification query finishes.
                res.json({ message: 'Proposal has been rejected.' });
            });
        });
    });
});

module.exports = router;
