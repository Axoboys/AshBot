const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");

// Railway fournit un PORT dynamique, sinon on utilise 3000
const PORT = process.env.PORT || 3000;

/* ========================= CONFIG ========================= */
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error("❌ DISCORD_TOKEN manquant"); process.exit(1); }

const ROLE_ID_MOD = "1480145261681446922";
const PRISON_ROLE_ID = "1499488299452993667";
const LOCK_CHANNEL_ID = "1499485051811790868";
const CONFERENCE_CHANNEL_ID = "1490332653193265265";
const CHANNEL_ID_PRESENTATION = "1480163939181658296";

const COOLDOWN_FILE = path.join(__dirname, "tdbCooldown.json");
const LOG_FILE = path.join(__dirname, "logs.txt");
const QUI_EST_CE_FILE = path.join(__dirname, "qui_est_ce.json");
const POINTS_FILE = path.join(__dirname, "points.json");

/* ========================= DEFINITIONS ========================= */
const DEFINITIONS = {
    tdb: "Abréviation de trou de balle.",
    goat: "Personne incroyablement forte.",
    bwan: "Menace de ban quelqu'un mais plus gentiment.",
    dentiste: "Lieu mystérieux.",
    bot: "Personne nulle sur un jeu vidéo."
};

/* ========================= GOAT IDS ========================= */
const IDS = {
    axo: "1114461558098104320",
    ash: "1301933852247199825"
};

const COMMANDS = {
    depop: { description: "Déconnecte un membre du vocal (modo uniquement)" },
    dentiste: { description: "Envoie un membre chez le dentiste (modo uniquement)" },
    lockvoc: { description: "Bloque un membre dans le vocal (modo uniquement)" },
    unlockvoc: { description: "Libère un membre du vocal (modo uniquement)" },
    tdb: { description: "Insulte amusante pour un membre" },
    tdb_pourcentage: { description: "Donne un pourcentage de TDB pour un membre" },
    bwan: { description: "Crie BWAN DEF à un membre" },
    lesaviezvous: { description: "Donne une anecdote aléatoire" },
    qui_est_ce: { description: "Démarre une partie de Qui est-ce ?" },
    nombre: { description: "Démarre une partie Devine le nombre" },
    definition: { description: "Donne la définition d'un mot" },
    help: { description: "Affiche la liste de toutes les commandes" },
    level: { description: "Affiche ton nombre de points" },
    classement: { description: "Affiche le top 10 des meilleurs" },
    histoire: { description: "Crée une histoire avec tes amis" },
    wordle: { description: "Trouve le mot le plus vite" },
    pileouface: { description: "Regarde si tu as de la chance" },
    theme: { description: "Te montre le thème du discord" },
    pendu: { description: "Trouve le mot le plus rapidement sans faire d'erreur" },
    presentation: { description: "Présente-toi au serveur" },
    axo: { description: "Dire à Axo qu'il est un GOAT" },
    ash: { description: "Dire à Ash qu'il est un GOAT" }
};

/* ========================= LOG ========================= */
function log(type, msg) {
    const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
    console.log(line.trim());
    try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

/* ========================= CLIENT ========================= */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

client.once("clientReady", () => {
    console.log(`✅ ${client.user.tag} prêt`);
});

/* ========================= 🌐 HTTP (requis par Railway) ========================= */
// Railway exige qu'un port soit ouvert, sinon il considère le service comme mort
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot en ligne ✅");
});

server.listen(PORT, () => {
    console.log(`🌐 Serveur HTTP actif sur le port ${PORT}`);
});

/* ========================= POINTS ========================= */
function getPoints() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, "{}");
    return JSON.parse(fs.readFileSync(POINTS_FILE));
}

function addPoints(userId, pts = 1) {
    const points = getPoints();
    if (!points[userId]) points[userId] = 0;
    points[userId] += pts;
    fs.writeFileSync(POINTS_FILE, JSON.stringify(points, null, 2));
}

/* ========================= JEUX ========================= */
const partiesQuiEstCe = new Map();
const partiesNombre = new Map();
const partiesHistoire = new Map();
const partiesWordle = new Map();
const partiesPendu = new Map();

/* ========================= COMMANDES ========================= */
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;

    log("CMD", `${cmd} par ${interaction.user.username}`);

    if (cmd === "help") {
        const commandList = Object.entries(COMMANDS)
            .map(([name, data]) => `• **/${name}** — ${data.description}`)
            .join("\n");

        const embed = {
            color: 0x2b2d31,
            title: "📜 Liste des commandes",
            description: commandList,
            footer: { text: "Bot by Axo 👑" }
        };

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /* ===== HISTOIRE ===== */
    if (cmd === "histoire") {
        const ch = interaction.channel.id;
        if (partiesHistoire.has(ch))
            return interaction.reply({ content: "❌ Une histoire est déjà en cours.", ephemeral: true });

        const msg = await interaction.reply({
            content: "📖 **Histoire collective !**\n✍️ Envoyez chacun une phrase.\n🧩 10 phrases nécessaires !",
            fetchReply: true
        });

        partiesHistoire.set(ch, { phrases: [], messages: [msg.id], dernierAuteur: null });
    }

    /* ===== PENDU ===== */
    if (cmd === "pendu") {
        const ch = interaction.channel.id;
        if (partiesPendu.has(ch))
            return interaction.reply({ content: "❌ Une partie de pendu est déjà en cours.", ephemeral: true });

        const mots = fs.readFileSync(path.join(__dirname, "mots.txt"), "utf8")
            .split("\n").map(m => m.trim().toLowerCase()).filter(Boolean);

        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = "_ ".repeat(motSecret.length).trim();

        const msg = await interaction.reply({
            content: `🪢 **PENDU**\n\nMot à deviner :\n\`${affichage}\`\n\n✍️ 10 erreurs autorisées.`,
            fetchReply: true
        });

        partiesPendu.set(ch, {
            mot: motSecret,
            lettresTrouvees: Array(motSecret.length).fill("_"),
            tentatives: 0,
            max: 10,
            lettresUtilisees: [],
            messages: [msg.id]
        });
    }

    /* ===== PILE OU FACE ===== */
    if (cmd === "pileouface") {
        const result = Math.random() < 0.5 ? "Pile" : "Face";
        const embed = new EmbedBuilder()
            .setTitle("🎲 Pile ou Face !")
            .setDescription(`💥 Le résultat est : **${result}** !`)
            .setColor("Random")
            .setFooter({ text: `Demandé par ${interaction.user.tag}` });
        return interaction.reply({ embeds: [embed] });
    }

    /* ===== WORDLE ===== */
    if (cmd === "wordle") {
        const ch = interaction.channel.id;
        if (partiesWordle.has(ch))
            return interaction.reply({ content: "❌ Une partie est déjà en cours.", ephemeral: true });

        const mots = fs.readFileSync(path.join(__dirname, "mots.txt"), "utf8")
            .split("\n").map(m => m.trim().toLowerCase()).filter(Boolean);

        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = "_ ".repeat(motSecret.length).trim();

        const msg = await interaction.reply({
            content: `🟩 **WORDLE FR**\n\nMot à ${motSecret.length} lettres :\n\`${affichage}\`\n\n✍️ Tu as 10 tentatives.`,
            fetchReply: true
        });

        partiesWordle.set(ch, {
            joueur: interaction.user.id,
            mot: motSecret,
            tentatives: 0,
            max: 10,
            messages: [msg.id],
            lettresTrouvees: Array(motSecret.length).fill("_")
        });
    }

    /* ===== MOD ===== */
    if (cmd === "depop") {
        const m = interaction.options.getMember("membre");
        if (!m?.voice.channel)
            return interaction.reply({ content: "❌ Pas en vocal.", ephemeral: true });
        await m.voice.disconnect();
        return interaction.reply(`✅ ${m.user.tag} déconnecté.`);
    }

    if (cmd === "dentiste") {
        const m = interaction.options.getMember("membre");
        if (!m) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
        if (!m?.voice.channel)
            return interaction.reply({ content: "❌ Ce membre n'est pas en vocal.", ephemeral: true });
        await m.voice.disconnect();
        return interaction.reply(`🦷 ${m.user.tag} a été envoyé chez le dentiste !`);
    }

    if (cmd === "lockvoc") {
        const m = interaction.options.getMember("membre");
        if (!m) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
        await m.voice.setChannel(LOCK_CHANNEL_ID).catch(() => {});
        await m.roles.add(PRISON_ROLE_ID).catch(() => {});
        return interaction.reply(`🔒 ${m.user.tag} est bloqué dans le vocal.`);
    }

    if (cmd === "unlockvoc") {
        const m = interaction.options.getMember("membre");
        if (!m) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
        await m.roles.remove(PRISON_ROLE_ID).catch(() => {});
        return interaction.reply(`✅ ${m.user.tag} est libéré du vocal.`);
    }

    /* ===== FUN ===== */
    if (cmd === "tdb") {
        const u = interaction.options.getUser("membre");
        return interaction.reply(`${u} t'es un TDB 😈`);
    }

    if (cmd === "tdb_pourcentage") {
        const id = interaction.user.id;
        const today = new Date().toDateString();
        let data = fs.existsSync(COOLDOWN_FILE) ? JSON.parse(fs.readFileSync(COOLDOWN_FILE)) : {};
        if (data[id] === today)
            return interaction.reply({ content: "⏳ Déjà utilisé aujourd'hui.", ephemeral: true });
        data[id] = today;
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
        const u = interaction.options.getUser("membre");
        return interaction.reply(`${u} a **${Math.floor(Math.random() * 101)}%** de TDB 😈`);
    }

    if (cmd === "bwan") {
        const u = interaction.options.getUser("membre");
        return interaction.reply(`💥 ${u} BWAN DEF 💥`);
    }

    /* ===== THEME ===== */
    if (cmd === "theme") {
        const embed = new EmbedBuilder()
            .setTitle("🎨 Thème du discord")
            .setDescription("Le theme de ce discord est l'alpinisme et la randonné chaque personne sont là pour un voyage !")
            .setColor("Purple")
            .setFooter({ text: `Demandé par ${interaction.user.tag}` });
        return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "definition") {
        const mot = interaction.options.getString("mot");
        if (!mot)
            return interaction.reply({ content: "❌ Aucun mot fourni.", ephemeral: true });
        const def = DEFINITIONS[mot.toLowerCase()];
        if (!def)
            return interaction.reply({ content: `❌ Aucune définition trouvée pour **${mot}**.`, ephemeral: true });
        return interaction.reply(`📖 **Définition de ${mot}** :\n${def}`);
    }

    if (cmd === "lesaviezvous") {
        const lines = fs.readFileSync(path.join(__dirname, "anecdotes.txt"), "utf8").split("\n").filter(Boolean);
        return interaction.reply(`🧠 **Le saviez-vous ?**\n${lines[Math.floor(Math.random() * lines.length)]}`);
    }

    /* ===== NOMBRE ===== */
    if (cmd === "nombre") {
        const ch = interaction.channel.id;
        if (partiesNombre.has(ch))
            return interaction.reply({ content: "❌ Partie déjà en cours.", ephemeral: true });
        const secret = Math.floor(Math.random() * 1000) + 1;
        const msg = await interaction.reply({
            content: "🔢 **Devine le nombre entre 1 et 1000 !**\n✍️ Tout le monde peut jouer",
            fetchReply: true
        });
        partiesNombre.set(ch, { nombre: secret, messages: [msg.id] });
    }

    /* ===== QUI EST CE ===== */
    if (cmd === "qui_est_ce") {
        const ch = interaction.channel.id;
        if (partiesQuiEstCe.has(ch))
            return interaction.reply({ content: "❌ Partie déjà en cours.", ephemeral: true });

        const data = JSON.parse(fs.readFileSync(QUI_EST_CE_FILE));
        const perso = data[Math.floor(Math.random() * data.length)];

        const msg = await interaction.reply({
            content: `🎭 **Qui est-ce ?**\n🧩 Indice : **${perso.indices[0]}**`,
            fetchReply: true
        });

        partiesQuiEstCe.set(ch, {
            reponse: perso.reponse.toLowerCase(),
            indices: perso.indices,
            index: 0,
            essais: 0,
            messages: [msg.id]
        });
    }

    /* ===== LEVEL ===== */
    if (cmd === "level") {
        const points = getPoints();
        return interaction.reply(`⭐ Tu as ${points[interaction.user.id] || 0} points.`);
    }

    if (cmd === "classement") {
        const points = getPoints();
        const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]).slice(0, 10);
        let msg = "🏆 Classement :\n";
        sorted.forEach(([id, pts], i) => { msg += `${i + 1}. <@${id}> : ${pts} pts\n`; });
        return interaction.reply(msg);
    }

    /* ===== GOAT ===== */
    if (IDS[cmd]) {
        return interaction.reply(`🐐 <@${IDS[cmd]}> est un GOAT ABSOLU 🐐`);
    }

    /* ===== PRESENTATION ===== */
    if (cmd === "presentation") {
        await interaction.reply({ content: "📩 Je t'envoie les questions en privé !", ephemeral: true });
        const user = interaction.user;
        try {
            const dm = await user.createDM();
            const questions = [
                "Ton prénom ?", "Ton pseudo ?", "Ton âge ?", "Ton origine ?",
                "Ta date d'anniversaire ?", "Ta taille ?", "Couleur des yeux ?",
                "Couleur des cheveux ?", "Tes qualités ?", "Tes défauts ?",
                "Ton hobby ?", "Ce que tu n'aimes pas ?"
            ];
            const reponses = [];
            for (const question of questions) {
                await dm.send(question);
                const collected = await dm.awaitMessages({ filter: m => m.author.id === user.id, max: 1, time: 300000 });
                if (!collected.size) return dm.send("⏰ Temps écoulé.");
                reponses.push(collected.first().content);
            }
            const embed = new EmbedBuilder()
                .setTitle(`🎉 Bienvenue ${reponses[1]} !`)
                .setColor("Blue")
                .setDescription(`
👤 Prénom : ${reponses[0]}
🎮 Pseudo : ${reponses[1]}
🎂 Âge : ${reponses[2]}
🌍 Origine : ${reponses[3]}
📅 Anniversaire : ${reponses[4]}
📏 Taille : ${reponses[5]}
👀 Yeux : ${reponses[6]}
💇 Cheveux : ${reponses[7]}
✨ Qualité : ${reponses[8]}
⚠️ Défaut : ${reponses[9]}
🎯 Hobby : ${reponses[10]}
❌ N'aime pas : ${reponses[11]}
`)
                .setFooter({ text: "Bienvenue sur le serveur !" });
            const channel = interaction.guild.channels.cache.get(CHANNEL_ID_PRESENTATION);
            if (channel) await channel.send({ embeds: [embed] });
            await dm.send("✅ Présentation envoyée !");
        } catch {
            await interaction.followUp({ content: "❌ Active tes DM.", ephemeral: true });
        }
    }
});

/* ========================= MESSAGE CREATE ========================= */
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    /* ===== PING BOT ===== */
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
        const reponses = [
            "ME DÉRANGE PAS ESPÈCE DE TDB 😡", "Tu crois je suis ton pote ?",
            "Ping encore et je t'ignore 😤", "J'suis pas Siri frère",
            "Respecte le bot un peu 😈", "Eh oh, calme-toi", "J'suis occupé là",
            "Encore un ping et je crash (non)", "Essaie encore de me ping et tu vas voir toi",
            "Ose me redéranger et je viens chez toi", "T'as cru que j'allais bien te répondre toi",
            "ARRETE DE ME DERANGER WESH", "Je vais te ban"
        ];
        return message.reply(reponses[Math.floor(Math.random() * reponses.length)]);
    }

    /* ===== JEU NOMBRE ===== */
    const partieN = partiesNombre.get(message.channel.id);
    if (partieN) {
        const guess = parseInt(message.content);
        if (isNaN(guess)) return;
        partieN.messages.push(message.id);
        if (guess === partieN.nombre) {
            await message.channel.bulkDelete(partieN.messages, true).catch(() => {});
            partiesNombre.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 <@${message.author.id}> a trouvé le nombre !`);
        }
        const botMsg = await message.reply(guess < partieN.nombre ? "📈 C'est plus !" : "📉 C'est moins !");
        if (botMsg) partieN.messages.push(botMsg.id);
        return;
    }

    /* ===== JEU HISTOIRE ===== */
    const partieH = partiesHistoire.get(message.channel.id);
    if (partieH) {
        if (partieH.dernierAuteur === message.author.id) {
            await message.delete().catch(() => {});
            const warn = await message.channel.send(`⚠️ <@${message.author.id}> tu ne peux pas envoyer 2 phrases de suite !`);
            setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }
        partieH.phrases.push(message.content);
        partieH.messages.push(message.id);
        partieH.dernierAuteur = message.author.id;
        if (partieH.phrases.length === 10) {
            const histoire = partieH.phrases.join(" ");
            await message.channel.bulkDelete(partieH.messages, true).catch(() => {});
            partiesHistoire.delete(message.channel.id);
            return message.channel.send(`✨ **Voici votre histoire :**\n\n${histoire}`);
        }
        return;
    }

    /* ===== JEU PENDU ===== */
    const partie = partiesPendu.get(message.channel.id);
    if (partie) {
        const guess = message.content.toLowerCase().trim();
        if (!/^[a-z]$/.test(guess)) return;

        if (partie.lettresUtilisees.includes(guess)) {
            const warn = await message.reply(`⚠️ Lettre déjà utilisée : **${guess.toUpperCase()}**`);
            setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }

        partie.lettresUtilisees.push(guess);
        partie.messages.push(message.id);
        let correct = false;

        for (let i = 0; i < partie.mot.length; i++) {
            if (partie.mot[i] === guess) {
                partie.lettresTrouvees[i] = guess.toUpperCase();
                correct = true;
            }
        }

        if (!correct) partie.tentatives++;
        const affichage = partie.lettresTrouvees.join(" ");

        if (!partie.lettresTrouvees.includes("_")) {
            await message.channel.bulkDelete(partie.messages, true).catch(() => {});
            partiesPendu.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 Bravo <@${message.author.id}> ! Tu as trouvé le mot : **${partie.mot.toUpperCase()}**`);
        }

        if (partie.tentatives >= partie.max) {
            await message.channel.bulkDelete(partie.messages, true).catch(() => {});
            partiesPendu.delete(message.channel.id);
            return message.channel.send(`❌ Partie terminée ! Le mot était : **${partie.mot.toUpperCase()}**`);
        }

        const botMsg = await message.channel.send(
            `\`${affichage}\`\n` +
            `🔹 Lettres utilisées : ${partie.lettresUtilisees.map(l => l.toUpperCase()).join(", ")}\n` +
            `❌ Erreurs : ${partie.tentatives}/${partie.max}`
        );
        partie.messages.push(botMsg.id);
        return;
    }

    /* ===== JEU WORDLE ===== */
    const partieW = partiesWordle.get(message.channel.id);
    if (partieW) {
        if (message.author.id !== partieW.joueur) {
            await message.delete().catch(() => {});
            return;
        }
        const guess = message.content.toLowerCase();
        if (guess.length !== partieW.mot.length) {
            await message.reply(`❌ Mot invalide (${partieW.mot.length} lettres).`)
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            await message.delete().catch(() => {});
            return;
        }
        partieW.tentatives++;
        partieW.messages.push(message.id);
        const lettresMalPlacees = [];
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === partieW.mot[i]) {
                partieW.lettresTrouvees[i] = guess[i].toUpperCase();
            } else if (partieW.mot.includes(guess[i])) {
                lettresMalPlacees.push(guess[i].toUpperCase());
            }
        }
        const affichage = partieW.lettresTrouvees.join(" ");
        if (guess === partieW.mot) {
            await message.channel.bulkDelete(partieW.messages, true).catch(() => {});
            partiesWordle.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 Bravo <@${message.author.id}> !\nMot trouvé en ${partieW.tentatives} coups !`);
        }
        if (partieW.tentatives >= partieW.max) {
            await message.channel.bulkDelete(partieW.messages, true).catch(() => {});
            partiesWordle.delete(message.channel.id);
            return message.channel.send(`❌ Perdu ! Le mot était : **${partieW.mot.toUpperCase()}**`);
        }
        const botMsg = await message.channel.send(
            `\`${affichage}\`\n\n` +
            (lettresMalPlacees.length > 0
                ? `🔶 Lettres mal placées : ${lettresMalPlacees.join(", ")}`
                : "⬜ Aucune lettre mal placée")
        );
        partieW.messages.push(botMsg.id);
        return;
    }

    /* ===== JEU QUI EST CE ===== */
    const partieQ = partiesQuiEstCe.get(message.channel.id);
    if (partieQ) {
        partieQ.essais++;
        partieQ.messages.push(message.id);
        if (message.content.toLowerCase().includes(partieQ.reponse)) {
            await message.channel.bulkDelete(partieQ.messages, true).catch(() => {});
            partiesQuiEstCe.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 <@${message.author.id}> a trouvé ! **${partieQ.reponse}**`);
        }
        if (partieQ.essais % 5 === 0) {
            partieQ.index++;
            if (partieQ.index >= partieQ.indices.length) {
                await message.channel.bulkDelete(partieQ.messages, true).catch(() => {});
                partiesQuiEstCe.delete(message.channel.id);
                return message.channel.send(`❌ Personne n'a trouvé… Réponse : **${partieQ.reponse}**`);
            }
            const indiceMsg = await message.channel.send(`🧩 Nouvel indice : **${partieQ.indices[partieQ.index]}**`);
            if (indiceMsg) partieQ.messages.push(indiceMsg.id);
        }
    }
});

client.login(TOKEN);
