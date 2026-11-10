export interface ISettingsComponent {
  HasAvailableSettings: boolean;
  Name: string;
  icon: string;
  ConfigPath: string;
  Changed: boolean;
  nestedConfigs: { id: string, name: string, visible: () => boolean, icon: string }[];
}
