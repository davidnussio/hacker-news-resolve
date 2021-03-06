import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { gqlConnector } from 'resolve-redux'
import uuid from 'uuid'
import styled from 'styled-components'

import actions from '../actions/storiesActions'
import ChildrenComments from '../components/ChildrenComments'
import Comment from '../components/Comment'

const Reply = styled.div`
  padding: 1em 1.25em 0 1.25em;
  margin-bottom: 1em;
`

export class CommentById extends React.PureComponent {
  saveComment = () => {
    const { match: { params: { storyId } }, data: { comment, me } } = this.props

    this.props.commentStory({
      storyId,
      parentId: comment.id,
      text: this.textarea.value,
      userId: me.id
    })

    this.textarea.disabled = true
    this.submit.disabled = true
  }

  componentWillReceiveProps = nextProps => {
    if (nextProps.lastCommentedStory === this.props.lastCommentedStory) {
      return
    }

    const { data: { me, refetch }, match: { params: { storyId } } } = this.props

    if (
      nextProps.lastCommentedStory.id === storyId &&
      nextProps.lastCommentedStory.userId === me.id
    ) {
      refetch()

      this.textarea.disabled = false
      this.submit.disabled = false
      this.textarea.value = ''
    }
  }

  render() {
    const { match: { params: { storyId } }, data: { comment, me } } = this.props

    if (!comment) {
      return null
    }

    const loggedIn = !!me

    return (
      <Comment storyId={storyId} level={0} {...comment}>
        {loggedIn ? (
          <Reply>
            <textarea
              ref={element => {
                if (element) {
                  this.textarea = element
                }
              }}
              name="text"
              rows="6"
              cols="70"
            />
            <div>
              <button
                ref={element => (this.submit = element)}
                onClick={this.saveComment}
              >
                reply
              </button>
            </div>
          </Reply>
        ) : null}
        <ChildrenComments
          storyId={storyId}
          comments={comment.replies}
          parentId={comment.id}
        />
      </Comment>
    )
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      commentStory: ({ storyId, parentId, userId, text }) =>
        actions.commentStory(storyId, {
          commentId: uuid.v4(),
          parentId,
          userId,
          text
        })
    },
    dispatch
  )

const mapStateToProps = ({ ui: { lastCommentedStory } }) => ({
  lastCommentedStory
})

export default gqlConnector(
  `
    fragment CommentWithReplies on Comment {
      id
      parentId
      text
      createdAt
      createdBy
      createdByName
      replies {
        ...CommentWithReplies
      }
    }

    query($id: ID!) {
      comment(id: $id) {
        ...CommentWithReplies
      }
      me {
        id
      }
    }
  `,
  {
    options: ({ match: { params: { commentId } } }) => ({
      variables: {
        id: commentId
      }
    })
  }
)(connect(mapStateToProps, mapDispatchToProps)(CommentById))
