// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
    // Generate random id for comment
    const commentId = randomBytes(4).toString('hex');

    // Get comment content from request body
    const { content } = req.body;

    // Get comments by post id
    const comments = commentsByPostId[req.params.id] || [];

    // Push new comment to comments array
    comments.push({ id: commentId, content, status: 'pending' });

    // Set comments array to comments object
    commentsByPostId[req.params.id] = comments;

    // Get event bus url from env
    const eventBusUrl = 'http://event-bus-srv:4005';

    // Send comment created event to event bus
    await axios.post(`${eventBusUrl}/events`, {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

// Route for receiving events
app.post('/events', async (req, res) => {
    // Get event type and data from request body
    const { type, data } = req.body;

    // If event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get comments by post id
        const comments = commentsByPostId[data.postId];

        // Get comment by id
        const comment = comments.find(comment => {
            return comment.id === data.id;
        });

        // Set comment status to data status
        comment.status = data.status;

        // Get event bus url from env
        const eventBusUrl = 'http://event-bus-srv:4005';

        // Send comment updated event to event bus
        await