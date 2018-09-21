import {NotificationState} from './notification.state';
import * as Actions from './notification.actions';
import {NotificationUserAction} from '../../../../../components/notification/types/notification-user-action.enum';
import {Notification} from '../../../../../components/notification/types';

export const initialNavigationState: NotificationState = {
  showNotification: false,
  notification: new Notification()
};

export function notificationReducer(state = initialNavigationState, action: Actions.NotificationAction): NotificationState {
  let newState: NotificationState;

  switch (action.type) {
    case Actions.SHOW_NOTIFICATION: {
      newState = {
        ...state,
        showNotification: true
      };
      break;
    }
    case Actions.ACCEPT_NOTIFICATION: {
      const modifiedState = newState = { ...state };
        modifiedState.notification.userAction = NotificationUserAction.ACCEPTED;
        modifiedState.showNotification = false;

      break;
    }
    case Actions.DECLINE_NOTIFICATION: {
      const modifiedState = newState = {...state};

       modifiedState.notification.userAction = NotificationUserAction.DECLINED;
       modifiedState.showNotification = false;

      break;
    }
    default:
      // do nothing
      return state;
  }
  console.log('REDUX [NotificationReducer] ' + action.type + ' with new state ' + JSON.stringify(newState));
  return newState;
}