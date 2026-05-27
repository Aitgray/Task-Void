import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Void: undefined;
  CreateTask: undefined;
  Task: { taskId: string };
  SkipTask: { taskId: string };
  Archive: undefined;
  Settings: undefined;
};

export type VoidNavProp = NativeStackNavigationProp<RootStackParamList, 'Void'>;
export type CreateTaskNavProp = NativeStackNavigationProp<RootStackParamList, 'CreateTask'>;

export type { NativeStackScreenProps } from '@react-navigation/native-stack';
