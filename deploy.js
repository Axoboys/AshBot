const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

/* =========================
   🔧 CONFIG
========================= */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1456735486650487035";
const GUILD_ID = "959116625926316082";

if (!TOKEN) {
	console.error("❌ DISCORD_TOKEN manquant dans le .env");
	process.exit(1);
}

/* =========================
   📜 COMMANDES
========================= */
const commands = [

	/* ===== /depop ===== */
	new SlashCommandBuilder()
		.setName("depop")
		.setDescription("Déconnecte un membre du vocal (modo)")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à déconnecter")
				.setRequired(true)
		),

	/* ===== /tdb ===== */
	new SlashCommandBuilder()
		.setName("tdb")
		.setDescription("Insulte gentiment quelqu'un")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("La victime")
				.setRequired(true)
		),

	/* ===== /pub ===== */
	new SlashCommandBuilder()
		.setName("pub")
		.setDescription("Faire la pub du live de Hestouille")
		.addStringOption(option =>
			option
				.setName("theme")
				.setDescription("Choisis le thème du live")
				.setRequired(true)
				.addChoices(
					{ name: "Fortnite", value: "fortnite" },
					{ name: "SpiderMan Miles Morales", value: "spiderman" },
					{ name: "Lego", value: "lego" }
				)
		),

	/* ===== /tdb_pourcentage ===== */
	new SlashCommandBuilder()
		.setName("tdb_pourcentage")
		.setDescription("Donne un pourcentage de trou de ballitude")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à analyser")
				.setRequired(true)
		),

	/* ===== /bwan ===== */
	new SlashCommandBuilder()
		.setName("bwan")
		.setDescription("BWAN quelqu'un")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("La victime")
				.setRequired(true)
		),

	/* ===== /definition ===== */
	new SlashCommandBuilder()
		.setName("definition")
		.setDescription("Donne la définition d'un mot")
		.addStringOption(option =>
			option.setName("mot")
				.setDescription("Le mot à définir")
				.setRequired(true)
		),

	/* ===== /nombre ===== */
	new SlashCommandBuilder()
		.setName("nombre")
		.setDescription("Démarre un jeu pour deviner un nombre entre 1 et 1000"),

	/* ===== /histoire ===== */
	new SlashCommandBuilder()
		.setName("histoire")
		.setDescription("Construit ton histoire avec tes amis (avec ou sans sens)"),

	/* ===== /pendu ===== */
	new SlashCommandBuilder()
		.setName("pendu")
		.setDescription("Trouve le mots le plus rapidement possible"),

	/* ===== /wordle ===== */
	new SlashCommandBuilder()
		.setName("wordle")
		.setDescription("Jour au Worldle pour gagné des points"),

	/* ===== /presentation ===== */
	new SlashCommandBuilder()
		.setName("presentation")
		.setDescription("Présente toi"),

	/* ===== /joinvoc ===== */
	new SlashCommandBuilder()
		.setName("joinvoc")
		.setDescription("Faire rejoindre le bot en vocal"),

	/* ===== /pileouface ===== */
	new SlashCommandBuilder()
		.setName("pileouface")
		.setDescription("Lance une pièce pour voir ci tu as de la chance"),

	/* ===== /theme ===== */
	new SlashCommandBuilder()
		.setName("theme")
		.setDescription("Quel est le théme de ce discord ?"),

	/* ===== /qui_est_ce ===== */
	new SlashCommandBuilder()
		.setName("qui_est_ce")
		.setDescription("Lance une partie de Qui est-ce"),

	/* ===== /dentiste ===== */
	new SlashCommandBuilder()
		.setName("dentiste")
		.setDescription("Envoie un membre chez le dentiste (modo)")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à envoyer")
				.setRequired(true)
		),

	/* ===== /lockvoc ===== */
	new SlashCommandBuilder()
		.setName("lockvoc")
		.setDescription("Bloque un membre dans le vocal (modo)")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à bloquer")
				.setRequired(true)
		),

	/* ===== /unlockvoc ===== */
	new SlashCommandBuilder()
		.setName("unlockvoc")
		.setDescription("Libère un membre du vocal (modo)")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à libérer")
				.setRequired(true)
		),

	/* ===== ECONOMIE ===== */
	new SlashCommandBuilder()
		.setName("level")
		.setDescription("Affiche ton nombre de points"),

	new SlashCommandBuilder()
		.setName("classement")
		.setDescription("Affiche le top 10 des joueurs"),

	/* ===== GOAT ===== */
	new SlashCommandBuilder().setName("moula").setDescription("GOAT moula"),
	new SlashCommandBuilder().setName("axo").setDescription("GOAT axo"),
	new SlashCommandBuilder().setName("mano").setDescription("GOAT mano"),
	new SlashCommandBuilder().setName("hestia").setDescription("GOAT hestia"),
	new SlashCommandBuilder().setName("banana").setDescription("GOAT banana"),
	new SlashCommandBuilder().setName("mat").setDescription("GOAT mat"),
	new SlashCommandBuilder().setName("chloe").setDescription("GOAT chloe"),
	new SlashCommandBuilder().setName("acidic").setDescription("GOAT acidic"),
	new SlashCommandBuilder().setName("greg").setDescription("GOAT greg"),
	new SlashCommandBuilder().setName("kayou").setDescription("GOAT kayou"),
	new SlashCommandBuilder().setName("jojo").setDescription("GOAT jojo"),
	new SlashCommandBuilder().setName("fanarupi").setDescription("GOAT fanarupi"),

	/* ===== /lesaviezvous ===== */
	new SlashCommandBuilder()
		.setName("lesaviezvous")
		.setDescription("Affiche une anecdote aléatoire"),

	/* ===== /help ===== */
	new SlashCommandBuilder()
		.setName("help")
		.setDescription("Montre toutes les commandes du bot")

].map(cmd => cmd.toJSON());

/* =========================
   🚀 DEPLOIEMENT
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
	try {
		console.log("🔄 Déploiement des commandes...");

		await rest.put(
			Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
			{ body: commands }
		);

		console.log("✅ Commandes déployées avec succès !");
	} catch (error) {
		console.error("❌ Erreur lors du déploiement :", error);
	}
})();