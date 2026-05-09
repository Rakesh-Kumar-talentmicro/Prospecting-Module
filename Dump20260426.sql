-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: prospects_module
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'b81d17d3-e73c-11f0-bf6b-04d4c47a061e:1-227';

--
-- Table structure for table `md_activity_status`
--

DROP TABLE IF EXISTS `md_activity_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_activity_status` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `activity_title` varchar(50) NOT NULL,
  `lang_id` varchar(10) DEFAULT 'EN',
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_activity_status`
--

LOCK TABLES `md_activity_status` WRITE;
/*!40000 ALTER TABLE `md_activity_status` DISABLE KEYS */;
INSERT INTO `md_activity_status` VALUES (1,'Pending','EN'),(2,'Closed','EN'),(3,'Cancelled','EN');
/*!40000 ALTER TABLE `md_activity_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_activity_status_translated`
--

DROP TABLE IF EXISTS `md_activity_status_translated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_activity_status_translated` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  `translated_title` varchar(100) NOT NULL,
  PRIMARY KEY (`activity_id`),
  UNIQUE KEY `uk_activity_status_lang` (`activity_id`,`lang_id`),
  CONSTRAINT `fk_activity_status` FOREIGN KEY (`activity_id`) REFERENCES `md_activity_status` (`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_activity_status_translated`
--

LOCK TABLES `md_activity_status_translated` WRITE;
/*!40000 ALTER TABLE `md_activity_status_translated` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_activity_status_translated` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_activity_type`
--

DROP TABLE IF EXISTS `md_activity_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_activity_type` (
  `activity_type_id` int NOT NULL AUTO_INCREMENT,
  `activity_type_title` varchar(100) NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (`activity_type_id`),
  UNIQUE KEY `uk_activity_type_title_lang` (`activity_type_title`,`lang_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_activity_type`
--

LOCK TABLES `md_activity_type` WRITE;
/*!40000 ALTER TABLE `md_activity_type` DISABLE KEYS */;
INSERT INTO `md_activity_type` VALUES (1,'Call','EN'),(7,'Demo','EN'),(2,'Email','EN'),(6,'Follow Up','EN'),(3,'Meeting','EN'),(10,'Negotiation','EN'),(9,'Presentation','EN'),(8,'Site Visit','EN'),(5,'SMS','EN'),(4,'WhatsApp','EN');
/*!40000 ALTER TABLE `md_activity_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_industry_size`
--

DROP TABLE IF EXISTS `md_industry_size`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_industry_size` (
  `industry_size_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (`industry_size_id`),
  UNIQUE KEY `uk_md_indusrty_size_title` (`title`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_size`
--

LOCK TABLES `md_industry_size` WRITE;
/*!40000 ALTER TABLE `md_industry_size` DISABLE KEYS */;
INSERT INTO `md_industry_size` VALUES (1,'Small','EN'),(2,'Medium','EN'),(3,'Large','EN');
/*!40000 ALTER TABLE `md_industry_size` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_industry_size_translated`
--

DROP TABLE IF EXISTS `md_industry_size_translated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_industry_size_translated` (
  `industry_size_id` int NOT NULL AUTO_INCREMENT,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  `translated_title` varchar(50) NOT NULL,
  PRIMARY KEY (`industry_size_id`),
  UNIQUE KEY `uk_industry_size_lang` (`industry_size_id`,`lang_id`),
  CONSTRAINT `fk_industry_size` FOREIGN KEY (`industry_size_id`) REFERENCES `md_industry_size` (`industry_size_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_size_translated`
--

LOCK TABLES `md_industry_size_translated` WRITE;
/*!40000 ALTER TABLE `md_industry_size_translated` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_industry_size_translated` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_industry_types`
--

DROP TABLE IF EXISTS `md_industry_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_industry_types` (
  `industry_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (`industry_id`),
  UNIQUE KEY `uk_md_indusrty_types_title` (`title`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_types`
--

LOCK TABLES `md_industry_types` WRITE;
/*!40000 ALTER TABLE `md_industry_types` DISABLE KEYS */;
INSERT INTO `md_industry_types` VALUES (1,'Agriculture, Forestry, Fishing and Hunting','EN'),(2,'Mining, Quarrying, and Oil and Gas Extraction','EN'),(3,'Utilities','EN'),(4,'Construction','EN'),(5,'Manufacturing','EN'),(6,'Wholesale Trade','EN'),(7,'Retail Trade','EN'),(8,'Transportation and Warehousing','EN'),(9,'Information','EN'),(10,'Finance and Insurance','EN'),(11,'Real Estate and Rental and Leasing','EN'),(12,'Professional, Scientific, and Technical Services','EN'),(13,'Management of Companies and Enterprises','EN'),(14,'Administrative and Support and Waste Management and Remediation Services','EN'),(15,'Educational Services','EN'),(16,'Health Care and Social Assistance','EN'),(17,'Arts, Entertainment, and Recreation','EN'),(18,'Accommodation and Food Services','EN'),(19,'Other Services except Public Administration','EN'),(20,'Public Administration','EN');
/*!40000 ALTER TABLE `md_industry_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_industry_types_translated`
--

DROP TABLE IF EXISTS `md_industry_types_translated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_industry_types_translated` (
  `industry_id` int NOT NULL AUTO_INCREMENT,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  `translated_title` varchar(150) NOT NULL,
  PRIMARY KEY (`industry_id`),
  UNIQUE KEY `uk_industry_lang` (`industry_id`,`lang_id`),
  CONSTRAINT `fk_industry_type` FOREIGN KEY (`industry_id`) REFERENCES `md_industry_types` (`industry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_types_translated`
--

LOCK TABLES `md_industry_types_translated` WRITE;
/*!40000 ALTER TABLE `md_industry_types_translated` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_industry_types_translated` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_languages`
--

DROP TABLE IF EXISTS `md_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_languages` (
  `language_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `native_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_languages`
--

LOCK TABLES `md_languages` WRITE;
/*!40000 ALTER TABLE `md_languages` DISABLE KEYS */;
INSERT INTO `md_languages` VALUES ('AR','Arabic','العربية'),('BN','Bengali','বাংলা'),('DA','Danish','Dansk'),('DE','German','Deutsch'),('EN','English','English'),('ES','Spanish','Español'),('FA','Farsi/Persian','فارسی'),('FI','Finnish','Suomi'),('FR','French','Français'),('GU','Gujarati','ગુજરાતી'),('HE','Hebrew','עברית'),('HI','Hindi','हिन्दी'),('ID','Indonesian','Bahasa Indonesia'),('IT','Italian','Italiano'),('JA','Japanese','日本語'),('KN','Kannada','ಕನ್ನಡ'),('KO','Korean','한국어'),('ML','Malayalam','മലയാളം'),('MR','Marathi','मराठी'),('MS','Malay','Bahasa Melayu'),('NL','Dutch','Nederlands'),('NO','Norwegian','Norsk'),('PA','Punjabi','ਪੰਜਾਬੀ'),('PL','Polish','Polski'),('PT','Portuguese','Português'),('RU','Russian','Русский'),('SV','Swedish','Svenska'),('TA','Tamil','தமிழ்'),('TE','Telugu','తెలుగు'),('TH','Thai','ภาษาไทย'),('TR','Turkish','Türkçe'),('UR','Urdu','اردو'),('VI','Vietnamese','Tiếng Việt'),('ZH_CN','Chinese (Simplified)','中文(简体)'),('ZH_TW','Chinese (Traditional)','中文(繁體)');
/*!40000 ALTER TABLE `md_languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_message_templates`
--

DROP TABLE IF EXISTS `md_message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_message_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_code` varchar(100) NOT NULL,
  `language_id` varchar(10) NOT NULL,
  `channel` enum('EMAIL','SMS','WHATSAPP') NOT NULL,
  `subject` varchar(500) NOT NULL,
  `body` text NOT NULL,
  `variables` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template` (`template_code`,`language_id`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_message_templates`
--

LOCK TABLES `md_message_templates` WRITE;
/*!40000 ALTER TABLE `md_message_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_message_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_prospects`
--

DROP TABLE IF EXISTS `md_prospects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_prospects` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `facebook_url` varchar(255) DEFAULT NULL,
  `instagram_url` varchar(255) DEFAULT NULL,
  `twitter_url` varchar(255) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `stage_code` int NOT NULL,
  `assigned_user_id` bigint DEFAULT NULL,
  `reason_id` int DEFAULT NULL,
  `notes` text,
  `follow_up_date` datetime DEFAULT NULL,
  `preferred_lang_id` varchar(10) DEFAULT 'EN',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stage` (`stage_code`),
  KEY `idx_user` (`assigned_user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone`),
  KEY `idx_follow_up` (`follow_up_date`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_prospects`
--

LOCK TABLES `md_prospects` WRITE;
/*!40000 ALTER TABLE `md_prospects` DISABLE KEYS */;
INSERT INTO `md_prospects` VALUES (1,'Acme Software Pvt Ltd','Riya Sharma','Sales Manager','riya.sharma@example.com','9876543210','https://www.linkedin.com/in/riya-sharma',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 15:58:37',1,NULL,NULL),(2,'BrightPath Solutions','Aman Verma','Founder','aman.verma@example.com','9123456780','https://www.linkedin.com/in/aman-verma',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 15:58:37',1,NULL,NULL),(3,'Global Tech Solutions','Alice Smith','CEO','alice.smith@example.com','9876543211','https://linkedin.com/in/alicesmith',NULL,NULL,NULL,10,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(4,'Innovate Inc','Bob Johnson','CTO','bob.johnson@example.com','9876543212','https://linkedin.com/in/bobjohnson',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(5,'Future Works','Charlie Brown','VP Sales','charlie.brown@example.com','9876543213','https://linkedin.com/in/charliebrown',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(6,'NextGen Systems','Diana Prince','Director','diana.prince@example.com','9876543214','https://linkedin.com/in/dianaprince',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(7,'Quantum Dynamics','Eve Adams','Manager','eve.adams@example.com','9876543215','https://linkedin.com/in/eveadams',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(8,'Apex Solutions','Frank White','Lead Developer','frank.white@example.com','9876543216','https://linkedin.com/in/frankwhite',NULL,NULL,NULL,13,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(9,'Summit Corp','Grace Lee','Marketing Head','grace.lee@example.com','9876543217','https://linkedin.com/in/gracelee',NULL,NULL,NULL,8,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(10,'Pioneer Tech','Henry Ford','Sales Exec','henry.ford@example.com','9876543218','https://linkedin.com/in/henryford',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(11,'Vanguard IT','Ivy Chen','Consultant','ivy.chen@example.com','9876543219','https://linkedin.com/in/ivychen',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(12,'Crest Innovations','Jack Black','Analyst','jack.black@example.com','9876543220','https://linkedin.com/in/jackblack',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(13,'Horizon Media','Karen Green','CEO','karen.green@example.com','9876543221','https://linkedin.com/in/karengreen',NULL,NULL,NULL,7,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(14,'Blue Sky Ventures','Leo Tolstoy','Founder','leo.tolstoy@example.com','9876543222','https://linkedin.com/in/leotolstoy',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(15,'Starlight Co','Mia Wong','CTO','mia.wong@example.com','9876543223','https://linkedin.com/in/miawong',NULL,NULL,NULL,7,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(16,'Nimbus Cloud','Noah Smith','VP Engineering','noah.smith@example.com','9876543224','https://linkedin.com/in/noahsmith',NULL,NULL,NULL,3,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(17,'Echo Systems','Olivia Davis','Director','olivia.davis@example.com','9876543225','https://linkedin.com/in/oliviadavis',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(18,'Nova Tech','Paul Walker','Manager','paul.walker@example.com','9876543226','https://linkedin.com/in/paulwalker',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(19,'Orion Group','Quinn Harris','Lead','quinn.harris@example.com','9876543227','https://linkedin.com/in/quinnharris',NULL,NULL,NULL,6,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(20,'Pulse Analytics','Rachel Zane','Head of Data','rachel.zane@example.com','9876543228','https://linkedin.com/in/rachelzane',NULL,NULL,NULL,5,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(21,'Vertex Solutions','Sam Wilson','Sales','sam.wilson@example.com','9876543229','https://linkedin.com/in/samwilson',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(22,'Zenith Corp','Tina Fey','Marketing','tina.fey@example.com','9876543230','https://linkedin.com/in/tinafey',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(23,'Alpha Omega','Uma Thurman','Consultant','uma.thurman@example.com','9876543231','https://linkedin.com/in/umathurman',NULL,NULL,NULL,4,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(24,'Beta Bytes','Victor Hugo','Analyst','victor.hugo@example.com','9876543232','https://linkedin.com/in/victorhugo',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(25,'Gamma Ray','Wendy Darling','CEO','wendy.darling@example.com','9876543233','https://linkedin.com/in/wendydarling',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(26,'Delta Force','Xavier Woods','Founder','xavier.woods@example.com','9876543234','https://linkedin.com/in/xavierwoods',NULL,NULL,NULL,8,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(27,'Epsilon Energy','Yara Shahidi','CTO','yara.shahidi@example.com','9876543235','https://linkedin.com/in/yarashahidi',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(28,'Zeta Zone','Zack Snyder','VP Sales','zack.snyder@example.com','9876543236','https://linkedin.com/in/zacksnyder',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(29,'Theta Tech','Alice Wonderland','Director','alice.wonderland@example.com','9876543237','https://linkedin.com/in/alicewonderland',NULL,NULL,NULL,2,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(30,'Iota Innovations','Bob Builder','Manager','bob.builder@example.com','9876543238','https://linkedin.com/in/bobbuilder',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(31,'Kappa Corp','Charlie Chaplin','Lead Developer','charlie.chaplin@example.com','9876543239','https://linkedin.com/in/charliechaplin',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(32,'Lambda Labs','Diana Ross','Marketing Head','diana.ross@example.com','9876543240','https://linkedin.com/in/dianaross',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL);
/*!40000 ALTER TABLE `md_prospects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_reasons`
--

DROP TABLE IF EXISTS `md_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_reasons` (
  `reason_id` int NOT NULL,
  `reason_title` varchar(100) NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (`reason_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_reasons`
--

LOCK TABLES `md_reasons` WRITE;
/*!40000 ALTER TABLE `md_reasons` DISABLE KEYS */;
INSERT INTO `md_reasons` VALUES (1,'Backed Out','EN'),(2,'Casual Enquiry','EN');
/*!40000 ALTER TABLE `md_reasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_reasons_translated`
--

DROP TABLE IF EXISTS `md_reasons_translated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_reasons_translated` (
  `reason_id` int NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  `translated_title` varchar(255) NOT NULL,
  PRIMARY KEY (`reason_id`,`lang_id`),
  CONSTRAINT `fk_reason_translated` FOREIGN KEY (`reason_id`) REFERENCES `md_reasons` (`reason_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_reasons_translated`
--

LOCK TABLES `md_reasons_translated` WRITE;
/*!40000 ALTER TABLE `md_reasons_translated` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_reasons_translated` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_sources`
--

DROP TABLE IF EXISTS `md_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_sources` (
  `source_id` int NOT NULL AUTO_INCREMENT,
  `source_key` varchar(50) NOT NULL,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (`source_id`),
  UNIQUE KEY `source_key` (`source_key`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_sources`
--

LOCK TABLES `md_sources` WRITE;
/*!40000 ALTER TABLE `md_sources` DISABLE KEYS */;
INSERT INTO `md_sources` VALUES (1,'MARKET RESEARCH','EN'),(2,'REFERRAL','EN'),(3,'COMPETITOR INTEL','EN'),(4,'GOOGLE SEARCH','EN'),(5,'INSTAGRAM','EN'),(6,'FACEBOOK','EN'),(7,'LINKEDIN','EN'),(8,'TWITTER_X','EN'),(9,'YOUTUBE','EN'),(10,'GOOGLE_ADS','EN'),(11,'WHATSAPP','EN'),(12,'CAMPAIGN_EMAIL','EN'),(13,'CAMPAIGN_SMS','EN'),(14,'WALK_IN','EN'),(15,'WEBSITE','EN'),(16,'COLD_CALL','EN'),(17,'EVENT','EN'),(18,'PARTNER','EN'),(19,'OTHER','EN');
/*!40000 ALTER TABLE `md_sources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_sources_translated`
--

DROP TABLE IF EXISTS `md_sources_translated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_sources_translated` (
  `source_id` int NOT NULL AUTO_INCREMENT,
  `lang_id` varchar(10) NOT NULL DEFAULT 'EN',
  `translated_title` varchar(100) NOT NULL,
  PRIMARY KEY (`source_id`),
  UNIQUE KEY `uk_source_lang` (`source_id`,`lang_id`),
  CONSTRAINT `fk_source` FOREIGN KEY (`source_id`) REFERENCES `md_sources` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_sources_translated`
--

LOCK TABLES `md_sources_translated` WRITE;
/*!40000 ALTER TABLE `md_sources_translated` DISABLE KEYS */;
/*!40000 ALTER TABLE `md_sources_translated` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_stages`
--

DROP TABLE IF EXISTS `md_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_stages` (
  `stage_code` int NOT NULL,
  `stage_key` varchar(50) NOT NULL,
  `progress` int NOT NULL,
  PRIMARY KEY (`stage_code`),
  UNIQUE KEY `stage_key` (`stage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_stages`
--

LOCK TABLES `md_stages` WRITE;
/*!40000 ALTER TABLE `md_stages` DISABLE KEYS */;
INSERT INTO `md_stages` VALUES (1,'PENDING',0),(2,'CONTACTED',20),(3,'INTERESTED',40),(4,'QUALIFIED',60),(5,'CONVERTED',100),(6,'DROPPED',-100),(7,'HOLD',-101),(8,'DEFERRED',-102);
/*!40000 ALTER TABLE `md_stages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `md_stages_translation`
--

DROP TABLE IF EXISTS `md_stages_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `md_stages_translation` (
  `stage_code` int NOT NULL,
  `lang_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_in_lang` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`stage_code`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `md_stages_translation_ibfk_1` FOREIGN KEY (`stage_code`) REFERENCES `md_stages` (`stage_code`),
  CONSTRAINT `md_stages_translation_ibfk_2` FOREIGN KEY (`lang_id`) REFERENCES `md_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_stages_translation`
--

LOCK TABLES `md_stages_translation` WRITE;
/*!40000 ALTER TABLE `md_stages_translation` DISABLE KEYS */;
INSERT INTO `md_stages_translation` VALUES (1,'EN','Pending'),(1,'HI','लंबित'),(1,'JA','保留中'),(1,'MS','Belum Selesai'),(1,'TH','รอดำเนินการ'),(2,'EN','Contacted'),(2,'HI','संपर्क किया'),(2,'JA','連絡済み'),(2,'MS','Dihubungi'),(2,'TH','ติดต่อแล้ว'),(3,'EN','Interested'),(3,'HI','इच्छुक'),(3,'JA','興味あり'),(3,'MS','Berminat'),(3,'TH','สนใจ'),(4,'EN','Qualified'),(4,'HI','योग्य'),(4,'JA','適格'),(4,'MS','Layak'),(4,'TH','มีคุณสมบัติ'),(5,'EN','Converted'),(5,'HI','परिवर्तित'),(5,'JA','転換済み'),(5,'MS','Ditukar'),(5,'TH','แปลงแล้ว'),(6,'EN','Dropped'),(6,'HI','हटाया गया'),(6,'JA','離脱'),(6,'MS','Digugurkan'),(6,'TH','ยกเลิก'),(7,'EN','Hold'),(7,'HI','रोका गया'),(7,'JA','保留'),(7,'MS','Ditangguh'),(7,'TH','พักไว้'),(8,'EN','Deferred'),(8,'HI','स्थगित'),(8,'JA','延期'),(8,'MS','Ditangguhkan'),(8,'TH','เลื่อนออกไป');
/*!40000 ALTER TABLE `md_stages_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_messages_logs`
--

DROP TABLE IF EXISTS `td_messages_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_messages_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `queue_id` bigint NOT NULL,
  `channel` enum('EMAIL','SMS','WHATSAPP') NOT NULL,
  `to_address` varchar(500) NOT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `provider_msg_id` varchar(255) DEFAULT NULL,
  `status` enum('SUCCESS','FAILED') NOT NULL,
  `response_body` text,
  `error_message` text,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `attempt_number` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_logs_provider_msg_id` (`provider_msg_id`),
  KEY `idx_message_logs_queue` (`queue_id`),
  KEY `idx_logs_status` (`status`),
  CONSTRAINT `fk_queue` FOREIGN KEY (`queue_id`) REFERENCES `td_messages_queue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_messages_logs`
--

LOCK TABLES `td_messages_logs` WRITE;
/*!40000 ALTER TABLE `td_messages_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_messages_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_messages_queue`
--

DROP TABLE IF EXISTS `td_messages_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_messages_queue` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `prospect_id` bigint DEFAULT NULL,
  `channel` enum('EMAIL','SMS','WHATSAPP') NOT NULL,
  `template_id` bigint DEFAULT NULL,
  `to_address` varchar(500) NOT NULL,
  `payload` json NOT NULL,
  `status` enum('PENDING','PROCESSING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `attempt_number` int DEFAULT '0',
  `max_attempt_number` int DEFAULT '3',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_template` (`template_id`),
  KEY `idx_message_queue_status` (`status`,`isActive`,`attempt_number`),
  KEY `idx_message_queue_scheduled` (`channel`),
  KEY `idx_message_queue_prospect` (`prospect_id`),
  CONSTRAINT `fk_queue_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `md_prospects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_template` FOREIGN KEY (`template_id`) REFERENCES `md_message_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_messages_queue`
--

LOCK TABLES `td_messages_queue` WRITE;
/*!40000 ALTER TABLE `td_messages_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_messages_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_prospects_activity`
--

DROP TABLE IF EXISTS `td_prospects_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_prospects_activity` (
  `t_id` bigint NOT NULL AUTO_INCREMENT,
  `prospect_id` bigint NOT NULL,
  `activity_type_id` int NOT NULL,
  `activity_notes` text,
  `activity_datetime` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`t_id`),
  KEY `fk_td_activity_type` (`activity_type_id`),
  CONSTRAINT `fk_td_activity_type` FOREIGN KEY (`activity_type_id`) REFERENCES `md_activity_type` (`activity_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_prospects_activity`
--

LOCK TABLES `td_prospects_activity` WRITE;
/*!40000 ALTER TABLE `td_prospects_activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_prospects_activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_stage_logs`
--

DROP TABLE IF EXISTS `td_stage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_stage_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `prospect_id` bigint NOT NULL,
  `from_stage` int DEFAULT NULL,
  `to_stage` int NOT NULL,
  `moved_by` bigint NOT NULL,
  `moved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reason_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prospect` (`prospect_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_stage_logs`
--

LOCK TABLES `td_stage_logs` WRITE;
/*!40000 ALTER TABLE `td_stage_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_stage_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_transfer_logs`
--

DROP TABLE IF EXISTS `td_transfer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_transfer_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `prospect_id` bigint NOT NULL,
  `from_user` bigint NOT NULL,
  `to_user` bigint NOT NULL,
  `transferred_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `transferred_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prospect` (`prospect_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_transfer_logs`
--

LOCK TABLES `td_transfer_logs` WRITE;
/*!40000 ALTER TABLE `td_transfer_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_transfer_logs` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-09  7:50:38
