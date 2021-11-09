import React from 'react'
import { ListGroup } from 'react-bootstrap'

const About = () => (
  <ListGroup className="text-center">
    <ListGroup.Item action href="https://github.com/JoinMarket-Org/joinmarket-clientserver" target="_blank">GitHub</ListGroup.Item>
    <ListGroup.Item action href="https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master/docs" target="_blank">Docs</ListGroup.Item>
    <ListGroup.Item action href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features" target="_blank">Features</ListGroup.Item>
    <ListGroup.Item action href="https://twitter.com/joinmarket" target="_blank">Twitter</ListGroup.Item>
  </ListGroup>
)

export default About
