-- AlterTable
ALTER TABLE `Item` ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `rarityColor` VARCHAR(191) NULL,
    MODIFY `description` TEXT NOT NULL;
