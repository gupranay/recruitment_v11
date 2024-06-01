import React from 'react'
import Profile from './Profile'
import Link from 'next/link'

export default function NavBar() {
  return (
    <div className='flex justify-between items-center h-20'>
        <Link href="/">
        <h1 className='text-xl font-bold'>Recruiter</h1>
        </Link>
        
        <Profile/>
    </div>
  )
}
