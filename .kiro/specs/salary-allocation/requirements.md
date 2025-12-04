# Requirements Document

## Introduction

Fitur Salary Allocation Calculator memungkinkan pengguna untuk menghitung dan merencanakan alokasi gaji bulanan mereka ke berbagai kategori pengeluaran seperti tabungan, makan, transportasi, hiburan, dan lainnya. Fitur ini menggunakan metode budgeting populer seperti 50/30/20 rule atau custom allocation, dan terintegrasi dengan sistem budget yang sudah ada untuk membantu pengguna mengelola keuangan dengan lebih terstruktur.

## Glossary

- **Salary_Allocation_System**: Sistem yang menghitung dan merekomendasikan pembagian gaji ke berbagai kategori pengeluaran
- **Allocation_Template**: Template preset untuk pembagian gaji (contoh: 50/30/20 rule)
- **Allocation_Category**: Kategori tujuan alokasi dana (tabungan, kebutuhan, keinginan, dll)
- **Allocation_Percentage**: Persentase dari gaji yang dialokasikan ke suatu kategori
- **Allocation_Amount**: Jumlah nominal rupiah yang dialokasikan ke suatu kategori
- **Monthly_Income**: Total pendapatan bulanan pengguna yang akan dialokasikan

## Requirements

### Requirement 1

**User Story:** As a user, I want to input my monthly salary, so that the system can calculate allocation recommendations for me.

#### Acceptance Criteria

1. WHEN a user enters a valid monthly income amount THEN the Salary_Allocation_System SHALL store the income value and display it in the allocation interface
2. WHEN a user enters an invalid income amount (negative, zero, or non-numeric) THEN the Salary_Allocation_System SHALL reject the input and display a validation error message
3. WHEN a user updates their monthly income THEN the Salary_Allocation_System SHALL recalculate all allocation amounts based on the new income value

### Requirement 2

**User Story:** As a user, I want to choose from preset allocation templates, so that I can quickly set up my budget without manual configuration.

#### Acceptance Criteria

1. WHEN a user selects the 50/30/20 template THEN the Salary_Allocation_System SHALL allocate 50% to needs, 30% to wants, and 20% to savings
2. WHEN a user selects the 70/20/10 template THEN the Salary_Allocation_System SHALL allocate 70% to needs, 20% to savings, and 10% to wants
3. WHEN a user selects a template THEN the Salary_Allocation_System SHALL display the calculated amounts for each category based on the monthly income
4. WHEN a user views available templates THEN the Salary_Allocation_System SHALL display template name, description, and percentage breakdown for each option

### Requirement 3

**User Story:** As a user, I want to create custom allocation percentages, so that I can tailor the budget to my specific financial situation.

#### Acceptance Criteria

1. WHEN a user creates a custom allocation THEN the Salary_Allocation_System SHALL allow setting percentage values for each category
2. WHEN a user sets allocation percentages that total more than 100% THEN the Salary_Allocation_System SHALL display a validation error and prevent saving
3. WHEN a user sets allocation percentages that total less than 100% THEN the Salary_Allocation_System SHALL display a warning showing the unallocated percentage
4. WHEN a user saves a valid custom allocation THEN the Salary_Allocation_System SHALL persist the allocation and calculate amounts for each category

### Requirement 4

**User Story:** As a user, I want to see detailed breakdown of my allocations, so that I can understand exactly how much money goes to each category.

#### Acceptance Criteria

1. WHEN the Salary_Allocation_System displays allocation results THEN the system SHALL show both percentage and nominal amount for each category
2. WHEN the Salary_Allocation_System displays allocation results THEN the system SHALL show a visual representation (progress bars or pie chart) of the allocation distribution
3. WHEN a user views allocation details THEN the Salary_Allocation_System SHALL display the category name, allocated percentage, allocated amount, and suggested spending limit per day/week

### Requirement 5

**User Story:** As a user, I want to apply my salary allocation to create budgets automatically, so that I can track my spending against the planned allocation.

#### Acceptance Criteria

1. WHEN a user applies an allocation to budgets THEN the Salary_Allocation_System SHALL create or update Budget records for each allocation category
2. WHEN a user applies an allocation THEN the Salary_Allocation_System SHALL map allocation categories to existing expense categories in the system
3. WHEN a user applies an allocation with unmapped categories THEN the Salary_Allocation_System SHALL prompt the user to select or create corresponding expense categories
4. WHEN budgets are created from allocation THEN the Salary_Allocation_System SHALL set the budget period to monthly with appropriate start and end dates

### Requirement 6

**User Story:** As a user, I want to save my allocation configurations, so that I can reuse them in future months.

#### Acceptance Criteria

1. WHEN a user saves an allocation configuration THEN the Salary_Allocation_System SHALL persist the configuration with a user-defined name
2. WHEN a user loads a saved configuration THEN the Salary_Allocation_System SHALL restore all category percentages and recalculate amounts based on current income
3. WHEN a user deletes a saved configuration THEN the Salary_Allocation_System SHALL remove the configuration and confirm the deletion

### Requirement 7

**User Story:** As a user, I want to serialize and deserialize my allocation data, so that I can export and import my configurations.

#### Acceptance Criteria

1. WHEN a user exports an allocation configuration THEN the Salary_Allocation_System SHALL generate a valid JSON representation of the allocation data
2. WHEN a user imports an allocation configuration THEN the Salary_Allocation_System SHALL parse the JSON and restore the allocation settings
3. WHEN a user imports an allocation configuration THEN the Salary_Allocation_System SHALL print (display) the parsed configuration for user verification before applying
