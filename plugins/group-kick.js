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
            const participants = await groupMetadata.participants;
            const nonAdminParticipants = participants.filter(
                participant => !participant.admin
            ).map(p => p.id);

            // Don't remove the bot itself
            const botJid = conn.user.id;
            const participantsToRemove = nonAdminParticipants.filter(jid => jid !== botJid);

            if (participantsToRemove.length === 0) {
                return reply("❌ No non-admin members to remove.");
            }

            // Remove in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < participantsToRemove.length; i += batchSize) {
                const batch = participantsToRemove.slice(i, i + batchSize);
                await conn.groupParticipantsUpdate(from, batch, "remove");
                await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between batches
            }

            return reply(`✅ Successfully removed ${participantsToRemove.length} members.`);
        } catch (error) {
            console.error("Remove all command error:", error);
            return reply("❌ Failed to remove members.");
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
