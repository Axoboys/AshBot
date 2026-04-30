const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    entersState
} = require("@discordjs/voice");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

/* ========================= RAILWAY : GESTION DES CRASHS ========================= */
// Empêche le bot de crasher sur des erreurs non rattrapées
process.on("uncaughtException", err => {
    console.error("❌ [uncaughtException]", err);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ [unhandledRejection]", reason);
});

/* ========================= CONFIG ========================= */
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error("❌ DISCORD_TOKEN manquant"); process.exit(1); }

const ROLE_ID_MOD = "1240306859211227166";
const PRISON_ROLE_ID = "1456786860415385794";
const LOCK_CHANNEL_ID = "1456800574652809237";
const CONFERENCE_CHANNEL_ID = "1240702033875439747";
const CHANNEL_ID_PRESENTATION = "1240692908231884912";

const COOLDOWN_FILE = path.join(__dirname, "tdbCooldown.json");
const PUB_COOLDOWN_FILE = path.join(__dirname, "pubCooldown.json");
const LOG_FILE = path.join(__dirname, "logs.txt");
const QUI_EST_CE_FILE = path.join(__dirname, "qui_est_ce.json");
const POINTS_FILE = path.join(__dirname, "points.json");

/* ========================= RAILWAY : DONNÉES EN MÉMOIRE ========================= */
// Sur Railway le filesystem est éphémère → on charge tout en mémoire au démarrage
// et on tente de sauvegarder sur disque, mais sans crasher si ça échoue.

function safeReadJSON(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        }
    } catch (e) {
        console.warn(`⚠️ Impossible de lire ${filePath} :`, e.message);
    }
    return defaultValue;
}

function safeWriteJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.warn(`⚠️ Impossible d'écrire ${filePath} :`, e.message);
    }
}

// Cache mémoire — chargé une seule fois au démarrage
let pointsCache = safeReadJSON(POINTS_FILE, {});
let tdbCooldownCache = safeReadJSON(COOLDOWN_FILE, {});
let pubCooldownCache = safeReadJSON(PUB_COOLDOWN_FILE, {});

/* ========================= DEFINITIONS ========================= */
const DEFINITIONS = {
    tdb: "Abréviation de trou de balle.",
    goat: "Personne incroyablement forte.",
    bwan: "Menace de ban quelqu'un mais plus gentiment.",
    dentiste: "Lieu mystérieux.",
    bot: "Personne nulle sur un jeu vidéo.",
    screugneugneu: "Arme qui screugneugneute bien fort les gens."
};

/* ========================= GOAT IDS ========================= */
const IDS = {
    moula: "1050790639161311283",
    axo: "1114461558098104320",
    hestia: "613782406650003468",
    mano: "630030626560671744",
    banana: "1006547074017394779",
    mat: "1301933852247199825",
    chloe: "1341766652701966419",
    acidic: "1365003269000138854",
    kayou: "1229237844015452222",
    jojo: "352081982894768130",
    fanarupi: "1188774372626939946",
    greg: "1379431022227230740"
};

// Commandes et descriptions
const COMMANDS = {
    depop: { description: "Déconnecte un membre du vocal (modo uniquement)" },
    dentiste: { description: "Envoie un membre chez le dentiste (modo uniquement)" },
    lockvoc: { description: "Bloque un membre dans le salon prison (modo uniquement)" },
    unlockvoc: { description: "Libère un membre du salon prison (modo uniquement)" },
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
    histoire: { description: "Construit ton histoire avec tes amis" },
    wordle: { description: "Trouve le mot le plus vite" },
    pileouface: { description: "Regarde si tu as de la chance" },
    theme: { description: "Te montre le thème du discord" },
    pendu: { description: "Trouve le mot le plus rapidement possible" },
    axo: { description: "Dire à Axo qu'il est un GOAT" },
    acidic: { description: "Dire à Acidic qu'il est un GOAT" },
    greg: { description: "Dire à Greg qu'il est un GOAT" },
    chloe: { description: "Dire à Chloé qu'elle est un GOAT" },
    kayou: { description: "Dire à Kayou qu'il est un GOAT" },
    mat: { description: "Dire à Mat qu'il est un GOAT" },
    hestia: { description: "Dire à Hestia qu'il est un GOAT" },
    mano: { description: "Dire à Mano qu'il est un GOAT" },
    jojo: { description: "Dire à Jojo qu'il est un GOAT" },
    moula: { description: "Dire à Moula qu'il est un GOAT" },
    banana: { description: "Dire à Banana qu'il est un GOAT" },
    fanarupi: { description: "Dire à Fanarupi qu'il est un GOAT" }
};

/* ========================= LOG ========================= */
function log(type, msg) {
    const line = `[${new Date().toISOString()}] [${type}] ${msg}`;
    console.log(line);
    // Tentative d'écriture sur disque (échoue silencieusement sur Railway)
    try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch {}
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

client.once("ready", () => {
    console.log(`✅ ${client.user.tag} prêt`);
});


/* ========================= POINTS ========================= */
function getPoints() {
    return pointsCache;
}

function addPoints(userId, pts = 1) {
    if (!pointsCache[userId]) pointsCache[userId] = 0;
    pointsCache[userId] += pts;
    safeWriteJSON(POINTS_FILE, pointsCache);
}

/* ========================= JEUX ========================= */
const partiesQuiEstCe = new Map();
const partiesNombre = new Map();
const partiesHistoire = new Map();
const partiesWordle = new Map();
const partiesPendu = new Map();

/* ========================= QUI EST-CE : ANALYSE QUESTION ========================= */
// FIX : fonction manquante ajoutée — gère les questions oui/non basiques
function analyserQuestion(question, reponse) {
    reponse = reponse.toLowerCase();

    // Questions sur le genre
    if (/\b(homme|garçon|mec|gars)\b/.test(question)) {
        const genres_feminin = ["femme", "fille", "lady", "reine", "princesse"];
        const estFeminin = genres_feminin.some(g => reponse.includes(g));
        return estFeminin ? "Non ❌" : "Oui ✅";
    }
    if (/\b(femme|fille|dame)\b/.test(question)) {
        const genres_feminin = ["femme", "fille", "lady", "reine", "princesse"];
        const estFeminin = genres_feminin.some(g => reponse.includes(g));
        return estFeminin ? "Oui ✅" : "Non ❌";
    }

    // Questions sur fiction/réel
    if (/\b(fictif|fictive|imaginaire|dessin animé|manga|film|série)\b/.test(question)) {
        return "Je ne peux pas répondre à cette question 🤷";
    }

    // Aucune question reconnue → retourne null (pas de réponse auto)
    return null;
}

/* ========================= COMMANDES ========================= */
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;
    try {

    /* ===== HELP ===== */
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

        partiesHistoire.set(ch, {
            phrases: [],
            messages: [msg.id],
            dernierAuteur: null
        });
    }

    /* ===== PENDU ===== */
    if (cmd === "pendu") {
        const ch = interaction.channel.id;

        if (partiesPendu.has(ch))
            return interaction.reply({ content: "❌ Une partie de pendu est déjà en cours.", ephemeral: true });

        const mots = fs.readFileSync(path.join(__dirname, "mots.txt"), "utf8")
            .split("\n")
            .map(m => m.trim().toLowerCase())
            .filter(Boolean);

        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = "_ ".repeat(motSecret.length).trim();

        const msg = await interaction.reply({
            content: `🪢 **PENDU**\n\nMot à deviner :\n\`${affichage}\`\n\n✍️ 10 erreurs autorisées.`,
            fetchReply: true
        });

        const timeoutPendu = setTimeout(async () => {
            if (partiesPendu.has(ch)) {
                partiesPendu.delete(ch);
                await interaction.channel.send(`⏰ Partie de pendu terminée faute de joueurs ! Le mot était : **${motSecret.toUpperCase()}**`).catch(() => {});
            }
        }, 15 * 60 * 1000);

        partiesPendu.set(ch, {
            mot: motSecret,
            lettresTrouvees: Array(motSecret.length).fill("_"),
            tentatives: 0,
            max: 10,
            lettresUtilisees: [],
            messages: [msg.id],
            timeout: timeoutPendu
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
            .split(/\r?\n/)
            .map(m => m.trim().toLowerCase())
            .filter(Boolean);

        const motSecret = mots[Math.floor(Math.random() * mots.length)];
        const affichage = "_ ".repeat(motSecret.length).trim();

        const msg = await interaction.reply({
            content: `🟩 **WORDLE FR**\n\nMot à ${motSecret.length} lettres :\n\`${affichage}\`\n\n✍️ Tu as 10 tentatives.`,
            fetchReply: true
        });

        const timeoutWordle = setTimeout(async () => {
            if (partiesWordle.has(ch)) {
                partiesWordle.delete(ch);
                await interaction.channel.send(`⏰ Partie de Wordle terminée faute de joueurs ! Le mot était : **${motSecret.toUpperCase()}**`).catch(() => {});
            }
        }, 15 * 60 * 1000);

        partiesWordle.set(ch, {
            joueur: interaction.user.id,
            mot: motSecret,
            tentatives: 0,
            max: 10,
            messages: [msg.id],
            lettresTrouvees: Array(motSecret.length).fill("_"),
            timeout: timeoutWordle
        });
    }

    /* ===== MOD : DEPOP ===== */
    if (cmd === "depop") {
        const member = interaction.member;
        if (!member.roles.cache.has(ROLE_ID_MOD))
            return interaction.reply({ content: "❌ Commande réservée aux modérateurs.", ephemeral: true });

        const m = interaction.options.getMember("membre");
        if (!m?.voice.channel)
            return interaction.reply({ content: "❌ Ce membre n'est pas en vocal.", ephemeral: true });

        await m.voice.disconnect();
        return interaction.reply(`✅ ${m.user.tag} déconnecté.`);
    }

    /* ===== MOD : DENTISTE ===== */
    if (cmd === "dentiste") {
        const member = interaction.member;
        if (!member.roles.cache.has(ROLE_ID_MOD))
            return interaction.reply({ content: "❌ Commande réservée aux modérateurs.", ephemeral: true });

        const m = interaction.options.getMember("membre");
        if (!m?.voice.channel)
            return interaction.reply({ content: "❌ Ce membre n'est pas en vocal.", ephemeral: true });

        await m.voice.setChannel(CONFERENCE_CHANNEL_ID);
        return interaction.reply(`🦷 ${m.user.tag} envoyé chez le dentiste.`);
    }

    /* ===== PUB ===== */
    // FIX : ajout de allowedMentions pour que @everyone fonctionne vraiment
    if (cmd === "pub") {
        const member = interaction.member;

        if (!member.roles.cache.has(ROLE_ID_MOD)) {
            return interaction.reply({
                content: "❌ Commande réservée aux modérateurs.",
                ephemeral: true
            });
        }

        const today = new Date().toDateString();

        if (pubCooldownCache.lastUse === today) {
            return interaction.reply({
                content: "⏳ Une pub a déjà été faite aujourd'hui.",
                ephemeral: true
            });
        }

        const messagesDir = path.join(__dirname, "messages");

        if (!fs.existsSync(messagesDir)) {
            try { fs.mkdirSync(messagesDir); } catch {}
        }

        const filePath = path.join(messagesDir, `${theme}.txt`);

        if (!fs.existsSync(filePath)) {
            return interaction.reply({
                content: `❌ Aucun fichier trouvé pour le thème **${theme}**.\nVérifie que le fichier \`messages/${theme}.txt\` existe bien sur le serveur.`,
                ephemeral: true
            });
        }

        const messagePub = fs.readFileSync(filePath, "utf8");

        pubCooldownCache.lastUse = today;
        safeWriteJSON(PUB_COOLDOWN_FILE, pubCooldownCache);

        await interaction.reply({ content: "✅ Pub envoyée !", ephemeral: true });

        // FIX : allowedMentions ajouté pour que @everyone ping vraiment
        await interaction.channel.send({
            content: `📢 **De la part de ${interaction.user}**\n\n${messagePub}\n\n@everyone`,
            allowedMentions: { parse: ["everyone"] }
        });
    }

    /* ===== JOIN VOC ===== */
    if (cmd === "joinvoc") {
        const member = interaction.member;

        if (!member.roles.cache.has(ROLE_ID_MOD)) {
            return interaction.reply({
                content: "❌ Commande réservée aux modérateurs.",
                ephemeral: true
            });
        }

        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: "❌ Tu dois être dans un salon vocal.",
                ephemeral: true
            });
        }

        try {
            let connection = getVoiceConnection(interaction.guild.id);
            if (connection) connection.destroy();

            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            return interaction.reply(`🎧 Je rejoins **${voiceChannel.name}** !`);

        } catch (error) {
            console.error("Erreur joinvoc :", error);
            return interaction.reply({
                content: "❌ Impossible de rejoindre le vocal.",
                ephemeral: true
            });
        }
    }

    /* ===== MOD : LOCKVOC ===== */
    if (cmd === "lockvoc") {
        const member = interaction.member;
        if (!member.roles.cache.has(ROLE_ID_MOD))
            return interaction.reply({ content: "❌ Commande réservée aux modérateurs.", ephemeral: true });

        const m = interaction.options.getMember("membre");
        if (!m) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

        await m.voice.setChannel(LOCK_CHANNEL_ID).catch(() => {});
        await m.roles.add(PRISON_ROLE_ID).catch(() => {});
        return interaction.reply(`🔒 ${m.user.tag} est bloqué en prison.`);
    }

    /* ===== MOD : UNLOCKVOC ===== */
    if (cmd === "unlockvoc") {
        const member = interaction.member;
        if (!member.roles.cache.has(ROLE_ID_MOD))
            return interaction.reply({ content: "❌ Commande réservée aux modérateurs.", ephemeral: true });

        const m = interaction.options.getMember("membre");
        if (!m) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

        await m.roles.remove(PRISON_ROLE_ID).catch(() => {});
        return interaction.reply(`✅ ${m.user.tag} est libéré.`);
    }

    /* ===== FUN ===== */
    if (cmd === "tdb") {
        const u = interaction.options.getUser("membre");
        return interaction.reply(`${u} t'es un TDB 😈`);
    }

    if (cmd === "tdb_pourcentage") {
        const id = interaction.user.id;
        const today = new Date().toDateString();
        if (tdbCooldownCache[id] === today)
            return interaction.reply({ content: "⏳ Déjà utilisé aujourd'hui.", ephemeral: true });
        tdbCooldownCache[id] = today;
        safeWriteJSON(COOLDOWN_FILE, tdbCooldownCache);
        const u = interaction.options.getUser("membre");
        return interaction.reply(`${u} a **${Math.floor(Math.random() * 101)}%** de TDB 😈`);
    }

    if (cmd === "bwan") {
        const u = interaction.options.getUser("membre");
        return interaction.reply(`💥 ${u} BWAN DEF 💥`);
    }

    /* ===== THEME ===== */
    if (cmd === "theme") {
        const phrase = "Le thème de ce discord est un monde grec antique où l'on peut discuter avec d'autres dans les bains publics !";

        const embed = new EmbedBuilder()
            .setTitle("🎨 Thème du discord")
            .setDescription(phrase)
            .setColor("Purple")
            .setFooter({ text: `Demandé par ${interaction.user.tag}` });

        return interaction.reply({ embeds: [embed] });
    }

    /* ===== DEFINITION ===== */
    if (cmd === "definition") {
        const mot = interaction.options.getString("mot");
        if (!mot)
            return interaction.reply({ content: "❌ Aucun mot fourni.", ephemeral: true });
        const def = DEFINITIONS[mot.toLowerCase()];
        if (!def)
            return interaction.reply({ content: `❌ Aucune définition trouvée pour **${mot}**.`, ephemeral: true });
        return interaction.reply(`📖 **Définition de ${mot}** :\n${def}`);
    }

    /* ===== LE SAVIEZ VOUS ===== */
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

        const timeoutNombre = setTimeout(async () => {
            if (partiesNombre.has(ch)) {
                partiesNombre.delete(ch);
                await interaction.channel.send(`⏰ Partie terminée faute de joueurs ! Le nombre était : **${secret}**`).catch(() => {});
            }
        }, 15 * 60 * 1000);

        partiesNombre.set(ch, { nombre: secret, messages: [msg.id], timeout: timeoutNombre });
    }

    /* ===== QUI EST-CE ===== */
    // FIX : stockage de la réponse sous "reponse" (cohérent avec le handler messageCreate)
    if (cmd === "qui_est_ce") {
        const ch = interaction.channel.id;
        if (partiesQuiEstCe.has(ch))
            return interaction.reply({ content: "❌ Partie déjà en cours.", ephemeral: true });

        let data;
        try {
            data = JSON.parse(fs.readFileSync(QUI_EST_CE_FILE));
        } catch (e) {
            return interaction.reply({ content: "❌ Fichier qui_est_ce.json introuvable ou invalide.", ephemeral: true });
        }

        const perso = data[Math.floor(Math.random() * data.length)];

        // Sécurité : vérifie que le personnage a bien les champs nécessaires
        if (!perso.nom || !perso.indices || perso.indices.length === 0) {
            return interaction.reply({ content: "❌ Données du personnage invalides.", ephemeral: true });
        }

        const msg = await interaction.reply({
            content: `🎭 **Qui est-ce ?**\n🧩 Indice 1 : **${perso.indices[0]}**\n\n💬 Réponds dans le chat !`,
            fetchReply: true
        });

        const timeoutQuiEstCe = setTimeout(async () => {
            const partie = partiesQuiEstCe.get(ch);
            if (partie) {
                await interaction.channel.bulkDelete(partie.messages, true).catch(() => {});
                partiesQuiEstCe.delete(ch);
                await interaction.channel.send(`⏰ Partie terminée ! C'était : **${perso.nom}**`).catch(() => {});
            }
        }, 15 * 60 * 1000);

        partiesQuiEstCe.set(ch, {
            reponse: perso.nom.toLowerCase(),  // FIX : JSON utilise "nom"
            indices: perso.indices,
            indexIndice: 0,
            essais: 0,
            messages: [msg.id],
            timeout: timeoutQuiEstCe
        });
    }

    /* ===== LEVEL ===== */
    if (cmd === "level") {
        const points = getPoints();
        return interaction.reply(`⭐ Tu as **${points[interaction.user.id] || 0}** points.`);
    }

    /* ===== CLASSEMENT ===== */
    if (cmd === "classement") {
        const points = getPoints();
        const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]).slice(0, 10);
        let msg = "🏆 **Classement :**\n";
        sorted.forEach(([id, pts], i) => {
            msg += `${i + 1}. <@${id}> : **${pts}** pts\n`;
        });
        return interaction.reply(msg);
    }

    /* ===== GOAT ===== */
    // FIX : un seul bloc (suppression du doublon en bas du fichier)
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
                "Ton prénom ?",
                "Ton pseudo ?",
                "Ton âge ?",
                "Ton origine ?",
                "Ta date d'anniversaire ?",
                "Ta taille ?",
                "Couleur des yeux ?",
                "Couleur des cheveux ?",
                "Tes qualités ?",
                "Tes défauts ?",
                "Ton hobby ?",
                "Ce que tu n'aimes pas ?"
            ];

            const reponses = [];

            for (const question of questions) {
                await dm.send(question);

                const collected = await dm.awaitMessages({
                    filter: m => m.author.id === user.id,
                    max: 1,
                    time: 300000
                });

                if (!collected.size) {
                    return dm.send("⏰ Temps écoulé, présentation annulée.");
                }

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
✨ Qualités : ${reponses[8]}
⚠️ Défauts : ${reponses[9]}
🎯 Hobby : ${reponses[10]}
❌ N'aime pas : ${reponses[11]}
`)
                .setFooter({ text: "Bienvenue sur le serveur !" });

            const channel = interaction.guild.channels.cache.get(CHANNEL_ID_PRESENTATION);
            if (channel) await channel.send({ embeds: [embed] });

            await dm.send("✅ Présentation envoyée !");

        } catch (err) {
            console.error("Erreur présentation :", err);
            await interaction.followUp({ content: "❌ Active tes DM pour utiliser cette commande.", ephemeral: true });
        }
    }
    } catch (err) {
        console.error(`❌ Erreur commande /${cmd} :`, err);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "❌ Une erreur est survenue.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
            }
        } catch {}
    }
});

/* ========================= MESSAGE CREATE ========================= */
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    try {

    /* ========================= PING BOT ========================= */
    if (
        message.mentions.has(client.user) &&
        !message.mentions.everyone
    ) {
        const reponses = [
            "ME DÉRANGE PAS ESPÈCE DE TDB 😡",
            "Tu crois je suis ton pote ?",
            "Ping encore et je t'ignore 😤",
            "J'suis pas Siri frère",
            "Respecte le bot un peu 😈",
            "Eh oh, calme-toi",
            "J'suis occupé là",
            "Encore un ping et je crash (non)",
            "Essaie encore de me ping et tu vas voir toi",
            "Ose me redérangé et je viens chez toi",
            "T'as cru que j'allais bien te répondre toi",
            "ARRETE DE ME DERANGER WESH",
            "Je vais te ban"
        ];

        return message.reply(reponses[Math.floor(Math.random() * reponses.length)]);
    }

    /* ========================= JEU PENDU ========================= */
    const partieP = partiesPendu.get(message.channel.id);

    if (partieP) {
        const guess = message.content.toLowerCase().trim();

        if (!/^[a-z]$/.test(guess)) return;

        if (partieP.lettresUtilisees.includes(guess)) {
            const warn = await message.reply(`⚠️ Lettre déjà utilisée : **${guess.toUpperCase()}**`);
            setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }

        partieP.lettresUtilisees.push(guess);
        partieP.messages.push(message.id);

        let correct = false;

        for (let i = 0; i < partieP.mot.length; i++) {
            if (partieP.mot[i] === guess) {
                partieP.lettresTrouvees[i] = guess.toUpperCase();
                correct = true;
            }
        }

        if (!correct) partieP.tentatives++;

        const affichage = partieP.lettresTrouvees.join(" ");

        if (!partieP.lettresTrouvees.includes("_")) {
            clearTimeout(partieP.timeout);
            await message.channel.bulkDelete(partieP.messages, true).catch(() => {});
            partiesPendu.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 Bravo <@${message.author.id}> ! Tu as trouvé le mot : **${partieP.mot.toUpperCase()}**`);
        }

        if (partieP.tentatives >= partieP.max) {
            clearTimeout(partieP.timeout);
            await message.channel.bulkDelete(partieP.messages, true).catch(() => {});
            partiesPendu.delete(message.channel.id);
            return message.channel.send(`❌ Partie terminée ! Le mot était : **${partieP.mot.toUpperCase()}**`);
        }

        const botMsg = await message.channel.send(
            `\`${affichage}\`\n` +
            `🔹 Lettres utilisées : ${partieP.lettresUtilisees.map(l => l.toUpperCase()).join(", ")}\n` +
            `❌ Erreurs : ${partieP.tentatives}/${partieP.max}`
        );

        partieP.messages.push(botMsg.id);
    }

    /* ========================= JEU NOMBRE ========================= */
    const partieN = partiesNombre.get(message.channel.id);

    if (partieN) {
        const guess = parseInt(message.content);
        if (isNaN(guess)) return;

        partieN.messages.push(message.id);

        if (guess === partieN.nombre) {
            clearTimeout(partieN.timeout);
            await message.channel.bulkDelete(partieN.messages, true).catch(() => {});
            partiesNombre.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(`🎉 <@${message.author.id}> a trouvé le nombre !`);
        }

        let botMsg;

        if (guess < partieN.nombre) {
            botMsg = await message.reply("📈 C'est plus !");
        } else {
            botMsg = await message.reply("📉 C'est moins !");
        }

        if (botMsg) partieN.messages.push(botMsg.id);
    }

    /* ========================= JEU WORDLE ========================= */
    const partieW = partiesWordle.get(message.channel.id);

    if (partieW) {
        const guess = message.content.toLowerCase().trim();

        if (guess.length !== partieW.mot.length) {
            await message.reply(`❌ Mot invalide (${partieW.mot.length} lettres).`)
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
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
            clearTimeout(partieW.timeout);
            await message.channel.bulkDelete(partieW.messages, true).catch(() => {});
            partiesWordle.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(
                `🎉 Bravo <@${message.author.id}> !\nMot trouvé en ${partieW.tentatives} coups !`
            );
        }

        if (partieW.tentatives >= partieW.max) {
            clearTimeout(partieW.timeout);
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
    }

    /* ========================= JEU HISTOIRE ========================= */
    const partieH = partiesHistoire.get(message.channel.id);

    if (partieH) {
        const dernierAuteur = partieH.dernierAuteur;

        if (dernierAuteur === message.author.id) {
            await message.delete().catch(() => {});
            const warn = await message.channel.send(
                `⚠️ <@${message.author.id}> tu ne peux pas envoyer 2 phrases de suite !`
            );
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
    }

    /* ========================= JEU QUI EST-CE ========================= */
    const partieQ = partiesQuiEstCe.get(message.channel.id);

    if (partieQ) {
        const guess = message.content.toLowerCase().trim();

        // Vérifie si c'est une question oui/non (contient un "?" ou des mots-clés de question)
        const estUneQuestion = guess.includes("?") || /\b(est[-\s]il|est[-\s]elle|a[-\s]t[-\s]il|a[-\s]t[-\s]elle|est ce que|est-ce)\b/.test(guess);

        // Tracker le message du joueur
        partieQ.messages.push(message.id);

        // Si c'est une question, on tente d'y répondre automatiquement
        if (estUneQuestion) {
            const reponseAuto = analyserQuestion(guess, partieQ.reponse);
            if (reponseAuto !== null && reponseAuto !== undefined) {
                const botMsg = await message.reply(`🤖 ${reponseAuto}`);
                partieQ.messages.push(botMsg.id);
                return;
            }
            const botMsg = await message.reply("🤷 Je ne peux pas répondre à cette question, essaie autrement !");
            partieQ.messages.push(botMsg.id);
            return;
        }

        // Sinon, c'est une tentative de réponse
        if (guess === partieQ.reponse) {
            clearTimeout(partieQ.timeout);
            const winMsg = `🎉 Bravo <@${message.author.id}> ! Tu as trouvé : **${partieQ.reponse}**`;
            // Supprimer tous les messages de la partie sauf le message de réponse finale
            await message.channel.bulkDelete(partieQ.messages, true).catch(() => {});
            partiesQuiEstCe.delete(message.channel.id);
            addPoints(message.author.id);
            return message.channel.send(winMsg);
        }

        partieQ.essais++;

        // Donner un nouvel indice tous les 3 essais si disponible
        if (partieQ.essais % 3 === 0) {
            partieQ.indexIndice++;
            if (partieQ.indexIndice < partieQ.indices.length) {
                const botMsg = await message.channel.send(
                    `🧩 Indice ${partieQ.indexIndice + 1} : **${partieQ.indices[partieQ.indexIndice]}**`
                );
                partieQ.messages.push(botMsg.id);
                return;
            } else {
                const botMsg = await message.reply(`❌ Mauvaise réponse ! (Plus d'indices disponibles)`);
                partieQ.messages.push(botMsg.id);
                return;
            }
        }

        const botMsg = await message.reply(`❌ Mauvaise réponse ! (Essai ${partieQ.essais})`);
        partieQ.messages.push(botMsg.id);
    }
    } catch (err) {
        console.error("❌ Erreur messageCreate :", err);
    }
});

client.login(TOKEN);