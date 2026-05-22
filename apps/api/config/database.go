package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func LoadEnv() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found at root, pakai environment bawaan OS")
	}
}

func DBInit() *gorm.DB {
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")
	sslmode := os.Getenv("SSL_MODE")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		host, user, password, name, port, sslmode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal koneksi ke database:", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Error mengambil database object:", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Tidak bisa mengakses database:", err)
	}
	log.Println("Berhasil koneksi ke database PostgreSQL via GORM")

	return db
}
