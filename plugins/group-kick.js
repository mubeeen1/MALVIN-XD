const { malvin } = require('../malvin');

malvin({
    pattern: "remove",
    alias: ["kick", "k"],
    desc: "Removes a member or all members from the group",
    category: "admin",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, quoted, senderNumber, groupMetadata
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Get the bot owner's number dynamically from conn.user.id
    const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    // Check if the user wants to remove all members
    if (q && q.toLowerCase() === 'all') {
        try {
            // Get fresh group metadata
            const metadata = await conn.groupMetadata(from);
            const participants = metadata.participants;
            
            // Filter out admins and the bot itself
            const nonAdminParticipants = participants.filter(
                participant => !participant.admin && participant.id !== conn.user.id
            ).map(p => p.id);

            if (nonAdminParticipants.length === 0) {
                return reply("❌ No non-admin members to remove.");
            }

            // Remove in batches to avoid rate limiting
            const batchSize = 5; // Reduced batch size for better reliability
            let successCount = 0;
            
            for (let i = 0; i < nonAdminParticipants.length; i += batchSize) {
                const batch = nonAdminParticipants.slice(i, i + batchSize);
                try {
                    await conn.groupParticipantsUpdate(from, batch, "remove");
                    successCount += batch.length;
                    await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 second delay
                } catch (batchError) {
                    console.error(`Error removing batch ${i}-${i+batchSize}:`, batchError);
                }
            }

            if (successCount > 0) {
                return reply(`✅ Successfully removed ${successCount} members.`);
            } else {
                return reply("❌ Failed to remove any members.");
            }
        } catch (error) {
            console.error("Remove all command error:", error);
            return reply("❌ Failed to remove members. Possible permission issues.");
        }
    }

    // Original single member removal logic
    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0];
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, '');
    } else {
        return reply("❌ Please reply to a message, mention a user, or use 'all' to remove all members.");
    }

    const jid = number + "@s.whatsapp.net";
    try {
        await conn.groupParticipantsUpdate(from, [jid], "remove");
        reply(`✅ Successfully removed @${number}`, { mentions: [jid] });
    } catch (error) {
        console.error("Remove command error:", error);
        reply("❌ Failed to remove the member.");
    }
});
