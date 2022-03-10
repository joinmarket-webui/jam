import React from 'react'

export default function Seedphrase({ seedphrase, isBlurred = true }) {
  return (
    <div className="seedphrase slashed-zeroes d-flex flex-wrap">
      {seedphrase.split(' ').map((seedWord, index) => (
        <div key={index} className="d-flex py-2 ps-2 pe-3">
          <span className="seedword-index text-secondary text-end">{index + 1}</span>
          <span className="text-secondary">.&nbsp;</span>
          <span className={isBlurred ? 'blurred-text' : ''}>{isBlurred ? 'abcdef' : seedWord}</span>
        </div>
      ))}
    </div>
  )
}
