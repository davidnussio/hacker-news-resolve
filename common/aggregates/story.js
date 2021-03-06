// @flow
import {
  STORY_CREATED,
  STORY_UPVOTED,
  STORY_UNVOTED,
  STORY_COMMENTED
} from '../events'
import type {
  Event,
  RawEvent,
  StoryCreated,
  StoryCommented,
  StoryUnvoted,
  StoryUpvoted
} from '../../flow-types/events'

import validate from './validation'

export default {
  name: 'story',
  initialState: {},
  commands: {
    createStory: (state: any, command: any): RawEvent<StoryCreated> => {
      validate.stateIsAbsent(state, 'Story')

      const { title, link, userId, text } = command.payload

      validate.fieldRequired(command.payload, 'userId')
      validate.fieldRequired(command.payload, 'title')

      return { type: STORY_CREATED, payload: { title, text, link, userId } }
    },

    upvoteStory: (state: any, command: any): RawEvent<StoryUpvoted> => {
      validate.stateExists(state, 'Story')

      const { userId } = command.payload

      validate.fieldRequired(command.payload, 'userId')
      validate.itemIsNotInArray(state.voted, userId, 'User already voted')

      return { type: STORY_UPVOTED, payload: { userId } }
    },

    unvoteStory: (state: any, command: any): RawEvent<StoryUnvoted> => {
      validate.stateExists(state, 'Story')

      const { userId } = command.payload

      validate.fieldRequired(command.payload, 'userId')
      validate.itemIsInArray(state.voted, userId, 'User did not vote')

      return { type: STORY_UNVOTED, payload: { userId } }
    },

    commentStory: (state: any, command: any): RawEvent<StoryCommented> => {
      validate.stateExists(state, 'Story')

      const { commentId, parentId, userId, text } = command.payload

      validate.fieldRequired(command.payload, 'userId')
      validate.fieldRequired(command.payload, 'parentId')
      validate.fieldRequired(command.payload, 'text')
      validate.keyIsNotInObject(
        state.comments,
        commentId,
        'Comment already exists'
      )

      return {
        type: STORY_COMMENTED,
        payload: {
          commentId,
          parentId,
          userId,
          text
        }
      }
    }
  },
  projection: {
    [STORY_CREATED]: (
      state,
      { timestamp, payload: { userId } }: Event<StoryCreated>
    ) => ({
      ...state,
      createdAt: timestamp,
      createdBy: userId,
      voted: [],
      comments: {}
    }),

    [STORY_UPVOTED]: (state, { payload: { userId } }: Event<StoryUpvoted>) => ({
      ...state,
      voted: state.voted.concat(userId)
    }),

    [STORY_UNVOTED]: (state, { payload: { userId } }: Event<StoryUnvoted>) => ({
      ...state,
      voted: state.voted.filter(curUserId => curUserId !== userId)
    }),
    [STORY_COMMENTED]: (
      state,
      { timestamp, payload: { commentId, userId } }: Event<StoryCommented>
    ) => ({
      ...state,
      comments: {
        ...state.comments,
        [commentId]: {
          createdAt: timestamp,
          createdBy: userId
        }
      }
    })
  }
}
