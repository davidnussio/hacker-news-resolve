// @flow
import {
  STORY_COMMENTED,
  STORY_CREATED,
  STORY_UNVOTED,
  STORY_UPVOTED,
  USER_CREATED
} from '../../events'
import type {
  Event,
  StoryCommented,
  StoryCreated,
  StoryUnvoted,
  StoryUpvoted,
  UserCreated
} from '../../../flow-types/events'

export default {
  Init: async store => {
    const stories = await store.collection('stories')
    const comments = await store.collection('comments')
    const users = await store.collection('users')

    await stories.ensureIndex({ fieldName: 'id' })
    await comments.ensureIndex({ fieldName: 'id' })
    await comments.ensureIndex({ fieldName: 'parentId' })
    await users.ensureIndex({ fieldName: 'id' })
  },

  [STORY_COMMENTED]: async (
    store,
    {
      aggregateId,
      timestamp,
      payload: { parentId, userId, commentId, text }
    }: Event<StoryCommented>
  ) => {
    {
      const comments = await store.collection('comments')

      const comment = {
        id: commentId,
        text,
        parentId,
        comments: [],
        storyId: aggregateId,
        createdAt: timestamp,
        createdBy: userId
      }

      await comments.insert(comment)
      const parentComment = await comments.findOne({ id: parentId })
      if (parentComment) {
        parentComment.comments.push(comment)
        await comments.update({ id: parentId }, parentComment)
      }
    }

    {
      const stories = await store.collection('stories')

      const storyById = await stories.findOne({ id: aggregateId })

      storyById.commentCount++

      const parentIndex =
        parentId === aggregateId
          ? -1
          : storyById.comments.findIndex(({ id }) => id === parentId)

      const level =
        parentIndex === -1 ? 0 : storyById.comments[parentIndex].level + 1

      const comment = {
        id: commentId,
        parentId,
        level,
        text,
        createdAt: timestamp,
        createdBy: userId
      }

      if (parentIndex === -1) {
        storyById.comments.push(comment)
      } else {
        storyById.comments = storyById.comments
          .slice(0, parentIndex + 1)
          .concat(comment, storyById.comments.slice(parentIndex + 1))
      }

      await stories.update({ id: aggregateId }, storyById)
    }
  },

  [STORY_CREATED]: async (
    store,
    {
      aggregateId,
      timestamp,
      payload: { title, link, userId, text }
    }: Event<StoryCreated>
  ) => {
    const type = !link ? 'ask' : /^(Show HN)/.test(title) ? 'show' : 'story'

    const stories = await store.collection('stories')
    await stories.insert({
      id: aggregateId,
      type,
      title,
      text,
      link,
      commentCount: 0,
      comments: [],
      votes: [],
      createdAt: timestamp,
      createdBy: userId
    })
  },

  [STORY_UPVOTED]: async (
    store,
    { aggregateId, payload: { userId } }: Event<StoryUpvoted>
  ) => {
    const stories = await store.collection('stories')

    const storyById = await stories.findOne({ id: aggregateId })

    await stories.update(
      { id: aggregateId },
      {
        ...storyById,
        votes: [...storyById.votes, userId]
      }
    )
  },

  [STORY_UNVOTED]: async (
    store,
    { aggregateId, payload: { userId } }: Event<StoryUnvoted>
  ) => {
    const stories = await store.collection('stories')

    const storyById = await stories.findOne({ id: aggregateId })

    await stories.update(
      { id: aggregateId },
      {
        ...storyById,
        votes: storyById.votes.filter(id => id !== userId)
      }
    )
  },

  [USER_CREATED]: async (
    store,
    { aggregateId, timestamp, payload: { name } }: Event<UserCreated>
  ) => {
    const users = await store.collection('users')

    await users.insert({
      id: aggregateId,
      name,
      createdAt: timestamp
    })
  }
}
