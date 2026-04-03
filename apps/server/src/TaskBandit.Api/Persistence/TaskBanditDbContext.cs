using Microsoft.EntityFrameworkCore;
using TaskBandit.Api.Persistence.Entities;

namespace TaskBandit.Api.Persistence;

public sealed class TaskBanditDbContext(DbContextOptions<TaskBanditDbContext> options) : DbContext(options)
{
    public DbSet<HouseholdEntity> Households => Set<HouseholdEntity>();

    public DbSet<HouseholdSettingsEntity> HouseholdSettings => Set<HouseholdSettingsEntity>();

    public DbSet<UserEntity> Users => Set<UserEntity>();

    public DbSet<ChoreTemplateEntity> ChoreTemplates => Set<ChoreTemplateEntity>();

    public DbSet<ChoreTemplateChecklistItemEntity> ChoreTemplateChecklistItems => Set<ChoreTemplateChecklistItemEntity>();

    public DbSet<ChoreTemplateDependencyEntity> ChoreTemplateDependencies => Set<ChoreTemplateDependencyEntity>();

    public DbSet<ChoreInstanceEntity> ChoreInstances => Set<ChoreInstanceEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<HouseholdEntity>(entity =>
        {
            entity.ToTable("households");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.HasOne(x => x.Settings)
                .WithOne(x => x.Household)
                .HasForeignKey<HouseholdSettingsEntity>(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Members)
                .WithOne(x => x.Household)
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.ChoreTemplates)
                .WithOne(x => x.Household)
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.ChoreInstances)
                .WithOne(x => x.Household)
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HouseholdSettingsEntity>(entity =>
        {
            entity.ToTable("household_settings");
            entity.HasKey(x => x.HouseholdId);
        });

        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DisplayName).HasMaxLength(120);
        });

        modelBuilder.Entity<ChoreTemplateEntity>(entity =>
        {
            entity.ToTable("chore_templates");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Description).HasMaxLength(2_000);
            entity.HasMany(x => x.ChecklistItems)
                .WithOne(x => x.Template)
                .HasForeignKey(x => x.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Dependencies)
                .WithOne(x => x.Template)
                .HasForeignKey(x => x.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChoreTemplateChecklistItemEntity>(entity =>
        {
            entity.ToTable("chore_template_checklist_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
        });

        modelBuilder.Entity<ChoreTemplateDependencyEntity>(entity =>
        {
            entity.ToTable("chore_template_dependencies");
            entity.HasKey(x => x.Id);
        });

        modelBuilder.Entity<ChoreInstanceEntity>(entity =>
        {
            entity.ToTable("chore_instances");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.HasOne(x => x.Template)
                .WithMany()
                .HasForeignKey(x => x.TemplateId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

