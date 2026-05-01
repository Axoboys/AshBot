const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

/* =========================
   🔧 CONFIG
========================= */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1499480448089456801";
const GUILD_ID = "1480144622067126363";

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

	/* ===== ECONOMIE ===== */
	new SlashCommandBuilder()
		.setName("level")
		.setDescription("Affiche ton nombre de points"),

	new SlashCommandBuilder()
		.setName("classement")
		.setDescription("Affiche le top 10 des joueurs"),

	/* ===== /definition ===== */
	new SlashCommandBuilder()
		.setName("definition")
		.setDescription("Donne la définition d'un mot")
		.addStringOption(option =>
			option.setName("mot")
				.setDescription("Le mot à définir")
				.setRequired(true)
		),

	new SlashCommandBuilder().setName("axo").setDescription("GOAT axo"),
	new SlashCommandBuilder().setName("ash").setDescription("GOAT ash"),


	/* ===== /nombre ===== */
	new SlashCommandBuilder()
		.setName("nombre")
		.setDescription("Chercher un nombre entre 1 et 1000"),

	/* ===== /histoire ===== */
	new SlashCommandBuilder()
		.setName("histoire")
		.setDescription("Construit ton histoire avec tes amis (avec ou sans sens)"),

	/* ===== /wordle ===== */
	new SlashCommandBuilder()
		.setName("wordle")
		.setDescription("Jour au Worldle pour gagné des points"),

	/* ===== /presentation ===== */
	new SlashCommandBuilder()
		.setName("presentation")
		.setDescription("Présente toi"),

	/* ===== /pendu ===== */
	new SlashCommandBuilder()
		.setName("pendu")
		.setDescription("Trouve le mots le plus rapidement possible"),

	/* ===== /pileouface ===== */
	new SlashCommandBuilder()
		.setName("pileouface")
		.setDescription("Lance une pièce pour voir ci tu as de la chance"),

	/* ===== /tdb_pourcentage ===== */
	new SlashCommandBuilder()
		.setName("tdb_pourcentage")
		.setDescription("Donne un pourcentage de trou de ballitude")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à analyser")
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

	/* ===== /dentiste ===== */
	new SlashCommandBuilder()
		.setName("dentiste")
		.setDescription("Envoie un membre chez le dentiste (modo)")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("Le membre à envoyer chez le dentiste")
				.setRequired(true)
		),

	/* ===== /qui_est_ce ===== */
	new SlashCommandBuilder()
		.setName("qui_est_ce")
		.setDescription("Lance une partie de Qui est-ce (célébrités / jeux vidéo)"),

	/* ===== /bwan ===== */
	new SlashCommandBuilder()
		.setName("bwan")
		.setDescription("BWAN quelqu'un")
		.addUserOption(option =>
			option.setName("membre")
				.setDescription("La victime")
				.setRequired(true)
		),

	/* ===== /lesaviezvous ===== */
	new SlashCommandBuilder()
		.setName("lesaviezvous")
		.setDescription("Affiche une anecdote aléatoire"),

	/* ===== /theme ===== */
	new SlashCommandBuilder()
		.setName("theme")
		.setDescription("Quel est le théme de ce discord ?"),

	/* ===== /help ===== */
	new SlashCommandBuilder()
		.setName("help")
		.setDescription("Montre toute les commandes du bot")

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
