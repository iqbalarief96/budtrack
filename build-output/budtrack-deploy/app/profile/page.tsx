'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FiUser, FiMail, FiShield, FiEdit2, FiSave } from 'react-icons/fi'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    name: '',
    email: '',
  })

  useEffect(() => {
    if (session?.user) {
      setUserData({
        name: session.user.name || '',
        email: session.user.email || '',
      })
    }
  }, [session])

  const handleSave = async () => {
    // This would connect to your API to update user profile
    // For now, we'll just toggle the editing state
    setIsEditing(false)
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Silakan login untuk melihat profil Anda</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Profil Pengguna</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-500 p-6 flex items-center space-x-4">
          <div className="w-20 h-20 bg-white text-blue-500 rounded-full flex items-center justify-center text-3xl font-bold">
            {userData.name?.charAt(0).toUpperCase() || <FiUser size={32} />}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{userData.name}</h2>
            <p className="text-blue-100">{userData.email}</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiUser className="mr-2" /> Informasi Profil
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="ml-auto text-blue-500 flex items-center"
              >
                {isEditing ? <FiSave size={18} /> : <FiEdit2 size={18} />}
                <span className="ml-1">{isEditing ? 'Simpan' : 'Edit'}</span>
              </button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nama</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={userData.name} 
                    onChange={(e) => setUserData({...userData, name: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  />
                ) : (
                  <p className="text-gray-800">{userData.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-800">{userData.email}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiShield className="mr-2" /> Keamanan
            </h3>
            
            <button className="px-4 py-2 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors">
              Ubah Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 