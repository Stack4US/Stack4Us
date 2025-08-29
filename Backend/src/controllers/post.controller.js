import * as postService from '../services/post.service.js';


export async function listAllPosts(req, res, next) {

    try {
    const posts = await postService.getAllPosts();
    res.status(200).json(posts);

} catch (err) {
    next(err);
}
}

export async function insertPost(req, res, next) {
    try {
    const newPost = await postService.createPost(req.body, req.file);
    res.status(201).json(newPost);

} catch (err) {
    next(err);
}
}

export async function deletePost(req, res, next) {
    try {
        const { id } = req.params;
        const user = req.user;

        if (user.rol !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete any post' });
        }

        await postService.removePost(id);
        res.status(200).json({ message: 'Post deleted successfully' });

    } catch (err) {
        next(err);
    }
}

export async function deleteOwnPost(req, res, next) {
    try {
        const { post_id } = req.params;
        const user = req.user; 

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await postService.removePost(post_id, user);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.status(200).json({ message: result.message });
        
    } catch (err) {
        next(err);
    }
}

export async function updateOwnPost(req, res, next) {
    try {
        const { post_id } = req.params;
        const user = req.user; 

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await postService.modifyPost(post_id, user, req.body, req.file);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.status(200).json(result.post);
    } catch (err) {
        next(err);
    }
} 

export async function getUserPosts(req, res, next) {
    try {
        const { userId } = req.params;
        const posts = await postService.getPostsByUser(userId);
        res.status(200).json(posts);
    } catch (err) {
        next(err);
    }
}
