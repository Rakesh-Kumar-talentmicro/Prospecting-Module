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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'b81d17d3-e73c-11f0-bf6b-04d4c47a061e:1-344';

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
  PRIMARY KEY (`activity_id`,`lang_id`),
  UNIQUE KEY `uk_activity_status_lang` (`activity_id`,`lang_id`),
  CONSTRAINT `fk_activity_status` FOREIGN KEY (`activity_id`) REFERENCES `md_activity_status` (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_activity_status_translated`
--

LOCK TABLES `md_activity_status_translated` WRITE;
/*!40000 ALTER TABLE `md_activity_status_translated` DISABLE KEYS */;
INSERT INTO `md_activity_status_translated` VALUES (1,'','लंबित...'),(1,'EN','Pending'),(1,'HI','लंबित...'),(1,'JA','保留中'),(1,'MS','Belum Selesai'),(1,'TH','รอดำเนินการ'),(2,'EN','Closed'),(2,'HI','बंद'),(2,'JA','終了'),(2,'MS','Ditutup'),(2,'TH','ปิดแล้ว'),(3,'EN','Cancelled'),(3,'HI','रद्द किया गया'),(3,'JA','キャンセル済み'),(3,'MS','Dibatalkan'),(3,'TH','ยกเลิกแล้ว');
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
  PRIMARY KEY (`industry_size_id`,`lang_id`),
  UNIQUE KEY `uk_industry_size_lang` (`industry_size_id`,`lang_id`),
  CONSTRAINT `fk_industry_size` FOREIGN KEY (`industry_size_id`) REFERENCES `md_industry_size` (`industry_size_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_size_translated`
--

LOCK TABLES `md_industry_size_translated` WRITE;
/*!40000 ALTER TABLE `md_industry_size_translated` DISABLE KEYS */;
INSERT INTO `md_industry_size_translated` VALUES (1,'EN','Small'),(1,'HI','छोटा'),(1,'JA','小規模'),(1,'MS','Kecil'),(1,'TH','ขนาดเล็ก'),(2,'EN','Medium'),(2,'HI','मध्यम'),(2,'JA','中規模'),(2,'MS','Sederhana'),(2,'TH','ขนาดกลาง'),(3,'EN','Large'),(3,'HI','बड़ा'),(3,'JA','大規模'),(3,'MS','Besar'),(3,'TH','ขนาดใหญ่');
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
  PRIMARY KEY (`industry_id`,`lang_id`),
  UNIQUE KEY `uk_industry_lang` (`industry_id`,`lang_id`),
  CONSTRAINT `fk_industry_type` FOREIGN KEY (`industry_id`) REFERENCES `md_industry_types` (`industry_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_industry_types_translated`
--

LOCK TABLES `md_industry_types_translated` WRITE;
/*!40000 ALTER TABLE `md_industry_types_translated` DISABLE KEYS */;
INSERT INTO `md_industry_types_translated` VALUES (1,'EN','Agriculture, Forestry, Fishing and Hunting'),(1,'HI','कृषि, वानिकी, मत्स्य पालन और शिकार'),(1,'JA','農業、林業、漁業および狩猟'),(1,'MS','Pertanian, Perhutanan, Perikanan dan Pemburuan'),(1,'TH','เกษตรกรรม ป่าไม้ ประมง และการล่าสัตว์'),(2,'EN','Mining, Quarrying, and Oil and Gas Extraction'),(2,'HI','खनन, उत्खनन तथा तेल और गैस निष्कर्षण'),(2,'JA','鉱業、採石業、石油・ガス採掘'),(2,'MS','Perlombongan, Pengkuarian dan Ekstraksi Minyak dan Gas'),(2,'TH','การทำเหมือง เหมืองหิน และการสกัดน้ำมันและก๊าซ'),(3,'EN','Utilities'),(3,'HI','उपयोगिताएँ'),(3,'JA','公益事業'),(3,'MS','Utiliti'),(3,'TH','สาธารณูปโภค'),(4,'EN','Construction'),(4,'HI','निर्माण'),(4,'JA','建設業'),(4,'MS','Pembinaan'),(4,'TH','การก่อสร้าง'),(5,'EN','Manufacturing'),(5,'HI','विनिर्माण'),(5,'JA','製造業'),(5,'MS','Pembuatan'),(5,'TH','การผลิต'),(6,'EN','Wholesale Trade'),(6,'HI','थोक व्यापार'),(6,'JA','卸売業'),(6,'MS','Perdagangan Borong'),(6,'TH','การค้าส่ง'),(7,'EN','Retail Trade'),(7,'HI','खुदरा व्यापार'),(7,'JA','小売業'),(7,'MS','Perdagangan Runcit'),(7,'TH','การค้าปลีก'),(8,'EN','Transportation and Warehousing'),(8,'HI','परिवहन और भंडारण'),(8,'JA','運輸および倉庫業'),(8,'MS','Pengangkutan dan Pergudangan'),(8,'TH','การขนส่งและคลังสินค้า'),(9,'EN','Information'),(9,'HI','सूचना'),(9,'JA','情報通信業'),(9,'MS','Maklumat'),(9,'TH','ข้อมูลข่าวสาร'),(10,'EN','Finance and Insurance'),(10,'HI','वित्त और बीमा'),(10,'JA','金融および保険業'),(10,'MS','Kewangan dan Insurans'),(10,'TH','การเงินและประกันภัย'),(11,'EN','Real Estate and Rental and Leasing'),(11,'HI','रियल एस्टेट तथा किराया और पट्टा'),(11,'JA','不動産および賃貸業'),(11,'MS','Hartanah dan Sewaan serta Pajakan'),(11,'TH','อสังหาริมทรัพย์และการเช่า'),(12,'EN','Professional, Scientific, and Technical Services'),(12,'HI','व्यावसायिक, वैज्ञानिक और तकनीकी सेवाएँ'),(12,'JA','専門・科学・技術サービス'),(12,'MS','Perkhidmatan Profesional, Saintifik dan Teknikal'),(12,'TH','บริการวิชาชีพ วิทยาศาสตร์ และเทคนิค'),(13,'EN','Management of Companies and Enterprises'),(13,'HI','कंपनियों और उद्यमों का प्रबंधन'),(13,'JA','企業および事業管理'),(13,'MS','Pengurusan Syarikat dan Perusahaan'),(13,'TH','การจัดการบริษัทและองค์กร'),(14,'EN','Administrative and Support and Waste Management and Remediation Services'),(14,'HI','प्रशासनिक, सहायता तथा अपशिष्ट प्रबंधन और सुधार सेवाएँ'),(14,'JA','管理・支援・廃棄物管理および浄化サービス'),(14,'MS','Perkhidmatan Pentadbiran, Sokongan dan Pengurusan Sisa'),(14,'TH','บริการด้านการบริหาร สนับสนุน และการจัดการของเสีย'),(15,'EN','Educational Services'),(15,'HI','शैक्षिक सेवाएँ'),(15,'JA','教育サービス'),(15,'MS','Perkhidmatan Pendidikan'),(15,'TH','บริการด้านการศึกษา'),(16,'EN','Health Care and Social Assistance'),(16,'HI','स्वास्थ्य देखभाल और सामाजिक सहायता'),(16,'JA','医療および社会支援'),(16,'MS','Penjagaan Kesihatan dan Bantuan Sosial'),(16,'TH','การดูแลสุขภาพและการช่วยเหลือสังคม'),(17,'EN','Arts, Entertainment, and Recreation'),(17,'HI','कला, मनोरंजन और अवकाश'),(17,'JA','芸術、娯楽およびレクリエーション'),(17,'MS','Seni, Hiburan dan Rekreasi'),(17,'TH','ศิลปะ บันเทิง และนันทนาการ'),(18,'EN','Accommodation and Food Services'),(18,'HI','आवास और खाद्य सेवाएँ'),(18,'JA','宿泊および飲食サービス'),(18,'MS','Penginapan dan Perkhidmatan Makanan'),(18,'TH','ที่พักและบริการอาหาร'),(19,'EN','Other Services except Public Administration'),(19,'HI','सार्वजनिक प्रशासन को छोड़कर अन्य सेवाएँ'),(19,'JA','その他サービス（公共行政を除く）'),(19,'MS','Perkhidmatan Lain kecuali Pentadbiran Awam'),(19,'TH','บริการอื่น ๆ ยกเว้นการบริหารราชการ'),(20,'EN','Public Administration'),(20,'HI','सार्वजनिक प्रशासन'),(20,'JA','公共行政'),(20,'MS','Pentadbiran Awam'),(20,'TH','การบริหารราชการ');
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
INSERT INTO `md_languages` VALUES ('AR','Arabic','العربية'),('BN','Bengali','বাংলা'),('DA','Danish','Dansk'),('DE','German','Deutsch'),('EN','English','English'),('ES','Spanish','Español'),('FA','Farsiii','فارسی'),('FI','Finnish','Suomi'),('FR','French','Français'),('GU','Gujarati','ગુજરાતી'),('HE','Hebrew','עברית'),('HI','Hindi','हिन्दी'),('ID','Indonesian','Bahasa Indonesia'),('IT','Italian','Italiano'),('JA','Japanese','日本語'),('KN','Kannada','ಕನ್ನಡ'),('KO','Korean','한국어'),('ML','Malayalam','മലയാളം'),('MR','Marathi','मराठी'),('MS','Malay','Bahasa Melayu'),('NL','Dutch','Nederlands'),('NO','Norwegian','Norsk'),('PA','Punjabi','ਪੰਜਾਬੀ'),('PL','Polish','Polski'),('PT','Portuguese','Português'),('RU','Russian','Русский'),('SV','Swedish','Svenska'),('TA','Tamil','தமிழ்'),('TE','Telugu','తెలుగు'),('TH','Thai','ภาษาไทย'),('TR','Turkish','Türkçe'),('UR','Urdu','اردو'),('VI','Vietnamese','Tiếng Việt'),('ZH_CN','Chinese (Simplified)','中文(简体)'),('ZH_TW','Chinese (Traditional)','中文(繁體)');
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_prospects`
--

LOCK TABLES `md_prospects` WRITE;
/*!40000 ALTER TABLE `md_prospects` DISABLE KEYS */;
INSERT INTO `md_prospects` VALUES (1,'TalentMicro Innovations Pvt Ltd','Aman Choudhary','Trainee SWE Intern','amanchoudharryyy@gmail.com','9122985861','https://www.linkedin.com/in/amanchoudharyyy/',NULL,NULL,NULL,1,3,NULL,NULL,'The candidate is intrested',NULL,'EN','2026-05-02 15:58:37',1,'2026-05-21 16:21:32',117),(2,'BrightPath Solutions','Aman Verma','Founder','aman.verma@example.com','9123456780','https://www.linkedin.com/in/aman-verma',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 15:58:37',1,NULL,NULL),(3,'Global Tech Solutions','Alice Smith','CEO','alice.smith@example.com','9876543211','https://linkedin.com/in/alicesmith',NULL,NULL,NULL,10,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(4,'Innovate Inc','Bob Johnson','CTO','bob.johnson@example.com','9876543212','https://linkedin.com/in/bobjohnson',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(5,'Future Works','Charlie Brown','VP Sales','charlie.brown@example.com','9876543213','https://linkedin.com/in/charliebrown',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(6,'NextGen Systems','Diana Prince','Director','diana.prince@example.com','9876543214','https://linkedin.com/in/dianaprince',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(7,'Quantum Dynamics','Eve Adams','Manager','eve.adams@example.com','9876543215','https://linkedin.com/in/eveadams',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(8,'Apex Solutions','Frank White','Lead Developer','frank.white@example.com','9876543216','https://linkedin.com/in/frankwhite',NULL,NULL,NULL,13,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(9,'Summit Corp','Grace Lee','Marketing Head','grace.lee@example.com','9876543217','https://linkedin.com/in/gracelee',NULL,NULL,NULL,8,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(10,'Pioneer Tech','Henry Ford','Sales Exec','henry.ford@example.com','9876543218','https://linkedin.com/in/henryford',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(11,'Vanguard IT','Ivy Chen','Consultant','ivy.chen@example.com','9876543219','https://linkedin.com/in/ivychen',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(12,'Crest Innovations','Jack Black','Analyst','jack.black@example.com','9876543220','https://linkedin.com/in/jackblack',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(13,'Horizon Media','Karen Green','CEO','karen.green@example.com','9876543221','https://linkedin.com/in/karengreen',NULL,NULL,NULL,7,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(14,'Blue Sky Ventures','Leo Tolstoy','Founder','leo.tolstoy@example.com','9876543222','https://linkedin.com/in/leotolstoy',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(15,'Starlight Co','Mia Wong','CTO','mia.wong@example.com','9876543223','https://linkedin.com/in/miawong',NULL,NULL,NULL,7,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(16,'Nimbus Cloud','Noah Smith','VP Engineering','noah.smith@example.com','9876543224','https://linkedin.com/in/noahsmith',NULL,NULL,NULL,3,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(17,'Echo Systems','Olivia Davis','Director','olivia.davis@example.com','9876543225','https://linkedin.com/in/oliviadavis',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(18,'Nova Tech','Paul Walker','Manager','paul.walker@example.com','9876543226','https://linkedin.com/in/paulwalker',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(19,'Orion Group','Quinn Harris','Lead','quinn.harris@example.com','9876543227','https://linkedin.com/in/quinnharris',NULL,NULL,NULL,6,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(20,'Pulse Analytics','Rachel Zane','Head of Data','rachel.zane@example.com','9876543228','https://linkedin.com/in/rachelzane',NULL,NULL,NULL,5,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(21,'Vertex Solutions','Sam Wilson','Sales','sam.wilson@example.com','9876543229','https://linkedin.com/in/samwilson',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(22,'Zenith Corp','Tina Fey','Marketing','tina.fey@example.com','9876543230','https://linkedin.com/in/tinafey',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(23,'Alpha Omega','Uma Thurman','Consultant','uma.thurman@example.com','9876543231','https://linkedin.com/in/umathurman',NULL,NULL,NULL,4,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(24,'Beta Bytes','Victor Hugo','Analyst','victor.hugo@example.com','9876543232','https://linkedin.com/in/victorhugo',NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(25,'Gamma Ray','Wendy Darling','CEO','wendy.darling@example.com','9876543233','https://linkedin.com/in/wendydarling',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(26,'Delta Force','Xavier Woods','Founder','xavier.woods@example.com','9876543234','https://linkedin.com/in/xavierwoods',NULL,NULL,NULL,8,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(27,'Epsilon Energy','Yara Shahidi','CTO','yara.shahidi@example.com','9876543235','https://linkedin.com/in/yarashahidi',NULL,NULL,NULL,9,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(28,'Zeta Zone','Zack Snyder','VP Sales','zack.snyder@example.com','9876543236','https://linkedin.com/in/zacksnyder',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(29,'Theta Tech','Alice Wonderland','Director','alice.wonderland@example.com','9876543237','https://linkedin.com/in/alicewonderland',NULL,NULL,NULL,2,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(30,'Iota Innovations','Bob Builder','Manager','bob.builder@example.com','9876543238','https://linkedin.com/in/bobbuilder',NULL,NULL,NULL,15,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(31,'Kappa Corp','Charlie Chaplin','Lead Developer','charlie.chaplin@example.com','9876543239','https://linkedin.com/in/charliechaplin',NULL,NULL,NULL,12,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL),(32,'Lambda Labs','Diana Ross','Marketing Head','diana.ross@example.com','9876543240','https://linkedin.com/in/dianaross',NULL,NULL,NULL,11,1,NULL,NULL,NULL,NULL,'EN','2026-05-02 16:36:35',1,NULL,NULL);
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
INSERT INTO `md_reasons` VALUES (1,'Backed Out','EN'),(2,'Casual Enquiry','EN'),(3,'Not Valid','EN'),(4,'Not Reachable','EN'),(5,'No Potential','EN');
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
INSERT INTO `md_reasons_translated` VALUES (1,'EN','Backed Out'),(1,'HI','पीछे हट गया'),(1,'JA','辞退'),(1,'MS','Menarik Diri'),(1,'TH','ถอนตัว'),(2,'EN','Casual Enquiry'),(2,'HI','सामान्य पूछताछ'),(2,'JA','一般的な問い合わせ'),(2,'MS','Pertanyaan Biasa'),(2,'TH','สอบถามทั่วไป'),(3,'EN','Not Valid'),(3,'HI','अमान्य'),(3,'JA','無効'),(3,'MS','Tidak Sah'),(3,'TH','ไม่ถูกต้อง'),(4,'EN','Not Reachable'),(4,'HI','संपर्क नहीं हो सका'),(4,'JA','連絡不可'),(4,'MS','Tidak Dapat Dihubungi'),(4,'TH','ติดต่อไม่ได้'),(5,'EN','No Potential'),(5,'HI','कोई संभावना नहीं'),(5,'JA','見込みなし'),(5,'MS','Tiada Potensi'),(5,'TH','ไม่มีศักยภาพ');
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_sources`
--

LOCK TABLES `md_sources` WRITE;
/*!40000 ALTER TABLE `md_sources` DISABLE KEYS */;
INSERT INTO `md_sources` VALUES (1,'MARKET RESEARCH','EN'),(2,'REFERRAL','EN'),(3,'COMPETITOR INTEL','EN'),(4,'GOOGLE SEARCH','EN'),(5,'INSTAGRAM','EN'),(6,'FACEBOOK','EN'),(7,'LINKEDIN','EN'),(8,'TWITTER_X','EN'),(9,'YOUTUBE','EN'),(10,'GOOGLE_ADS','EN'),(11,'WHATSAPP','EN'),(12,'CAMPAIGN_EMAIL','EN'),(13,'CAMPAIGN_SMS','EN'),(14,'WALK_IN','EN'),(15,'WEBSITE','EN'),(16,'COLD_CALL','EN'),(17,'EVENT','EN'),(18,'PARTNER','EN'),(19,'APOLLO','EN'),(20,'OTHER','EN');
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
  PRIMARY KEY (`source_id`,`lang_id`),
  UNIQUE KEY `uk_source_lang` (`source_id`,`lang_id`),
  CONSTRAINT `fk_source` FOREIGN KEY (`source_id`) REFERENCES `md_sources` (`source_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `md_sources_translated`
--

LOCK TABLES `md_sources_translated` WRITE;
/*!40000 ALTER TABLE `md_sources_translated` DISABLE KEYS */;
INSERT INTO `md_sources_translated` VALUES (1,'EN','Market Research'),(1,'HI','बाजार अनुसंधान'),(1,'JA','市場調査'),(1,'MS','Penyelidikan Pasaran'),(1,'TH','การวิจัยตลาด'),(2,'EN','Referral'),(2,'HI','संदर्भ'),(2,'JA','紹介'),(2,'MS','Rujukan'),(2,'TH','การแนะนำ'),(3,'EN','Competitor Intel'),(3,'HI','प्रतिद्वंद्वी जानकारी'),(3,'JA','競合情報'),(3,'MS','Maklumat Pesaing'),(3,'TH','ข้อมูลคู่แข่ง'),(4,'EN','Google Search'),(4,'HI','गूगल खोज'),(4,'JA','Google検索'),(4,'MS','Carian Google'),(4,'TH','ค้นหาผ่าน Google'),(5,'EN','Instagram'),(5,'HI','इंस्टाग्राम'),(5,'JA','Instagram'),(5,'MS','Instagram'),(5,'TH','Instagram'),(6,'EN','Facebook'),(6,'HI','फेसबुक'),(6,'JA','Facebook'),(6,'MS','Facebook'),(6,'TH','Facebook'),(7,'EN','LinkedIn'),(7,'HI','लिंक्डइन'),(7,'JA','LinkedIn'),(7,'MS','LinkedIn'),(7,'TH','LinkedIn'),(8,'EN','Twitter/X'),(8,'HI','ट्विटर/X'),(8,'JA','Twitter/X'),(8,'MS','Twitter/X'),(8,'TH','Twitter/X'),(9,'EN','YouTube'),(9,'HI','यूट्यूब'),(9,'JA','YouTube'),(9,'MS','YouTube'),(9,'TH','YouTube'),(10,'EN','Google Ads'),(10,'HI','गूगल विज्ञापन'),(10,'JA','Google広告'),(10,'MS','Iklan Google'),(10,'TH','Google Ads'),(11,'EN','WhatsApp'),(11,'HI','व्हाट्सएप'),(11,'JA','WhatsApp'),(11,'MS','WhatsApp'),(11,'TH','WhatsApp'),(12,'EN','Campaign Email'),(12,'HI','अभियान ईमेल'),(12,'JA','キャンペーンメール'),(12,'MS','E-mel Kempen'),(12,'TH','อีเมลแคมเปญ'),(13,'EN','Campaign SMS'),(13,'HI','अभियान एसएमएस'),(13,'JA','キャンペーンSMS'),(13,'MS','SMS Kempen'),(13,'TH','SMS แคมเปญ'),(14,'EN','Walk In'),(14,'HI','वॉक-इन'),(14,'JA','来店'),(14,'MS','Walk In'),(14,'TH','Walk In'),(15,'EN','Website'),(15,'HI','वेबसाइट'),(15,'JA','ウェブサイト'),(15,'MS','Laman Web'),(15,'TH','เว็บไซต์'),(16,'EN','Cold Call'),(16,'HI','कोल्ड कॉल'),(16,'JA','コールドコール'),(16,'MS','Panggilan Dingin'),(16,'TH','โทรหาลูกค้าโดยตรง'),(17,'EN','Event'),(17,'HI','कार्यक्रम'),(17,'JA','イベント'),(17,'MS','Acara'),(17,'TH','กิจกรรม'),(18,'EN','Partner'),(18,'HI','साझेदार'),(18,'JA','パートナー'),(18,'MS','Rakan Kongsi'),(18,'TH','พาร์ทเนอร์'),(19,'EN','Apollo'),(19,'HI','अपोलो'),(19,'JA','Apollo'),(19,'MS','Apollo'),(19,'TH','Apollo'),(20,'EN','Other'),(20,'HI','अन्य'),(20,'JA','その他'),(20,'MS','Lain-lain'),(20,'TH','อื่น ๆ');
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
  `seq` int DEFAULT NULL,
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
INSERT INTO `md_stages` VALUES (1,'PENDING',1,0),(2,'ATTEMPTED',2,30),(3,'ENGAGED',3,60),(4,'CONVERTED',4,100),(5,'PARKED',5,-100);
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
INSERT INTO `md_stages_translation` VALUES (1,'EN','Pending'),(1,'HI','लंबित'),(1,'JA','保留中'),(1,'MS','Belum Selesai'),(1,'TH','รอดำเนินการ'),(2,'EN','Attempted'),(2,'HI','प्रयास किया'),(2,'JA','試行済み'),(2,'MS','Dicuba'),(2,'TH','พยายามแล้ว'),(3,'EN','Engaged'),(3,'HI','संलग्न'),(3,'JA','関与中'),(3,'MS','Terlibat'),(3,'TH','มีส่วนร่วม'),(4,'EN','Converted'),(4,'HI','परिवर्तित'),(4,'JA','転換済み'),(4,'MS','Ditukar'),(4,'TH','แปลงแล้ว'),(5,'EN','Parked'),(5,'HI','पार्क किया गया'),(5,'JA','保留'),(5,'MS','Diparkir'),(5,'TH','พักไว้');
/*!40000 ALTER TABLE `md_stages_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `td_activity`
--

DROP TABLE IF EXISTS `td_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `td_activity` (
  `t_id` bigint NOT NULL AUTO_INCREMENT,
  `prospect_id` bigint NOT NULL,
  `activity_type_id` int NOT NULL,
  `activity_status_id` int NOT NULL DEFAULT '1',
  `message_queue_id` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`t_id`),
  KEY `idx_td_activity_prospect` (`prospect_id`),
  KEY `idx_td_activity_type` (`activity_type_id`),
  KEY `idx_td_activity_status` (`activity_status_id`),
  KEY `idx_td_activity_message_queue` (`message_queue_id`),
  CONSTRAINT `fk_pm_td_activity_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `md_prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_td_activity_status` FOREIGN KEY (`activity_status_id`) REFERENCES `md_activity_status` (`activity_id`),
  CONSTRAINT `fk_pm_td_activity_type` FOREIGN KEY (`activity_type_id`) REFERENCES `md_activity_type` (`activity_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_activity`
--

LOCK TABLES `td_activity` WRITE;
/*!40000 ALTER TABLE `td_activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `td_activity` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `td_stage_logs`
--

LOCK TABLES `td_stage_logs` WRITE;
/*!40000 ALTER TABLE `td_stage_logs` DISABLE KEYS */;
INSERT INTO `td_stage_logs` VALUES (1,1,1,2,105,'2026-05-13 10:21:37',NULL),(2,1,2,3,117,'2026-05-21 16:21:32',NULL);
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

-- Dump completed on 2026-05-24 18:50:41
