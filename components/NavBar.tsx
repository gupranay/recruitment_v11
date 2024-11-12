import React from 'react'
import Profile from './Profile'
import Link from 'next/link'

export default function NavBar() {
  return (
    <div className='flex justify-between items-center h-20'>
        <div className='flex items-center'>
            <Link href="/">
            <h1 className='text-xl font-bold'>Recruitify</h1>
            </Link>
        </div>
        <div className='flex items-center'>
            <Profile/>
        </div>
    </div>
  )
}
