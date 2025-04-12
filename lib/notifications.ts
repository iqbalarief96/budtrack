'use server'

import prisma from '@/lib/prisma'
import { sendEmail, getGroupNotificationEmailTemplate } from './email'

type NotificationType = 
  | 'NEW_TRANSACTION' 
  | 'BUDGET_LIMIT' 
  | 'NEW_MEMBER' 
  | 'REMOVED_MEMBER'
  | 'PRIVACY_CHANGE'
  | 'SETTINGS_CHANGE'

/**
 * Mengirim notifikasi grup ke semua member yang memiliki notifikasi diaktifkan
 */
export async function sendGroupNotification({
  type,
  actorId,
  groupId,
  entityId,
  details
}: {
  type: NotificationType
  actorId: string // User yang memicu notifikasi
  groupId: string
  entityId?: string // ID dari entity yang terkait (seperti transaction_id)
  details?: string // Detail tambahan
}) {
  try {
    console.log(`Starting sendGroupNotification for ${type} in group ${groupId}`);
    
    // Dapatkan info grup
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { 
        members: {
          include: { user: true }
        }
      }
    })

    if (!group) {
      console.error(`Group with ID ${groupId} not found`);
      throw new Error(`Group with ID ${groupId} not found`)
    }

    // Dapatkan info actor (user yang melakukan aksi)
    const actor = await prisma.user.findUnique({
      where: { id: actorId }
    })

    if (!actor) {
      console.error(`Actor user with ID ${actorId} not found`);
      throw new Error(`Actor user with ID ${actorId} not found`)
    }

    console.log(`Found group "${group.name}" with ${group.members.length} members`);

    // Dapatkan notifikasi untuk tiap user
    const members = group.members

    // Dapat group URL untuk action link
    const groupUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/groups/${groupId}`

    // Map tipe notifikasi ke subjek dan pesan
    let notificationConfig;
    try {
      notificationConfig = getNotificationConfig(type, actor.name || 'A user', group.name)
    } catch (configError) {
      console.error('Error getting notification config:', configError);
      // Use default configuration if there's an error
      notificationConfig = {
        subject: `Update in ${group.name}`,
        action: `A group update has occurred`,
        defaultDetails: `There's been an update in your group.`,
        actionPath: ''
      }
    }

    // Track successes and failures
    const results = {
      success: 0,
      failure: 0,
      errors: [] as string[]
    }

    // Kirim email ke semua members yang punya notifikasi settings di-enable
    for (const member of members) {
      try {
        // Don't skip actor user anymore - send notifications to everyone including the actor
        // if (member.userId === actorId) continue
        
        // Untuk demo, kita langsung kirim email ke semua users
        // Di implementasi nyata, kita akan cek preferences dari database

        // Jika user punya email, kirim email notification
        if (member.user.email) {
          // Customize the message based on whether recipient is the actor or not
          const isActor = member.userId === actorId;
          const customDetails = isActor 
            ? `You have ${notificationConfig.action.toLowerCase()}.` 
            : details || notificationConfig.defaultDetails;
          
          const emailTemplate = await getGroupNotificationEmailTemplate({
            groupName: group.name,
            action: notificationConfig.action,
            userName: isActor ? "you" : (actor.name || 'a group member'),
            details: customDetails,
            actionUrl: `${groupUrl}${notificationConfig.actionPath || ''}`
          })

          const emailResult = await sendEmail({
            to: member.user.email,
            subject: notificationConfig.subject,
            html: emailTemplate
          })

          if (emailResult.success) {
            results.success++
          } else {
            results.failure++
            results.errors.push(`Failed to send email to ${member.user.email}`)
          }
        }

        // TODO: In the future, we'll implement push notifications
      } catch (memberError) {
        console.error(`Error processing notification for member ${member.userId}:`, memberError)
        results.failure++
        results.errors.push(`Error for member ${member.userId}: ${(memberError as Error).message}`)
      }
    }

    return {
      success: results.success > 0,
      sent: results.success,
      failed: results.failure,
      errors: results.errors
    }
  } catch (error) {
    console.error('Error sending group notification:', error)
    return { 
      success: false, 
      sent: 0,
      failed: 1,
      errors: [(error as Error).message] 
    }
  }
}

// Helper function untuk konfigurasi notifikasi berdasarkan tipe
function getNotificationConfig(type: NotificationType, actorName: string, groupName: string) {
  switch (type) {
    case 'NEW_TRANSACTION':
      return {
        subject: `New Transaction in ${groupName}`,
        action: `A new transaction has been added`,
        defaultDetails: `${actorName} added a new transaction to your group.`,
        actionPath: '/transactions'
      }
    case 'BUDGET_LIMIT':
      return {
        subject: `Budget Limit Alert for ${groupName}`,
        action: `A budget limit has been reached`,
        defaultDetails: `One of your group budgets has reached its limit.`,
        actionPath: '/transactions'
      }
    case 'NEW_MEMBER':
      return {
        subject: `New Member Joined ${groupName}`,
        action: `A new member has joined`,
        defaultDetails: `${actorName} added a new member to your group.`,
        actionPath: '/members'
      }
    case 'REMOVED_MEMBER':
      return {
        subject: `Member Removed from ${groupName}`,
        action: `A member has been removed`,
        defaultDetails: `${actorName} removed a member from your group.`,
        actionPath: '/members'
      }
    case 'PRIVACY_CHANGE':
      return {
        subject: `Privacy Settings Changed for ${groupName}`,
        action: `Privacy settings have been updated`,
        defaultDetails: `${actorName} changed the privacy settings of your group.`,
        actionPath: '/settings'
      }
    case 'SETTINGS_CHANGE':
      return {
        subject: `Settings Updated for ${groupName}`,
        action: `Group settings have been updated`,
        defaultDetails: `${actorName} updated the settings of your group.`,
        actionPath: '/settings'
      }
    default:
      return {
        subject: `Update in ${groupName}`,
        action: `A group update has occurred`,
        defaultDetails: `There's been an update in your group by ${actorName}.`,
        actionPath: ''
      }
  }
}