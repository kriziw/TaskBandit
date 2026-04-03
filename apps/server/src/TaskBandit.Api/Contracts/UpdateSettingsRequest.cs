namespace TaskBandit.Api.Contracts;

public sealed record UpdateSettingsRequest(
    bool? SelfSignupEnabled,
    bool? MembersCanSeeFullHouseholdChoreDetails,
    bool? EnablePushNotifications,
    bool? EnableOverduePenalties);

