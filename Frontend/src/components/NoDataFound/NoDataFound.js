import React from 'react'

const NoDataFound = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <h1
        className="text-xl"
        style={{ fontSize: '30px', fontFamily: 'cursive', marginTop: '40px' }}
      >
        No Data Found
      </h1>
    </div>
  )
}

export default NoDataFound
