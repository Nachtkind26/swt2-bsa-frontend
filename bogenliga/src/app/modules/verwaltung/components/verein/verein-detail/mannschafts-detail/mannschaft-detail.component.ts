import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {isNullOrUndefined, isUndefined} from '@shared/functions';
import {ButtonType, CommonComponent, toTableRows} from '../../../../../shared/components';
import {BogenligaResponse} from '../../../../../shared/data-provider';
import {
  Notification,
  NotificationOrigin,
  NotificationService,
  NotificationSeverity,
  NotificationType,
  NotificationUserAction
} from '../../../../../shared/services/notification';
import {VereinDataProviderService} from '../../../../services/verein-data-provider.service';
import {DsbMitgliedDO} from '../../../../types/dsb-mitglied-do.class';
import {VereinDO} from '../../../../types/verein-do.class';
import {MANNSCHAFT_DETAIL_CONFIG} from './mannschaft-detail.config';
import {DsbMannschaftDO} from '@verwaltung/types/dsb-mannschaft-do.class';
import {DsbMannschaftDataProviderService} from '@verwaltung/services/dsb-mannschaft-data-provider.service';
import {VeranstaltungDO} from '@verwaltung/types/veranstaltung-do.class';
import {VeranstaltungDataProviderService} from '@verwaltung/services/veranstaltung-data-provider.service';
import {DsbMannschaftDTO} from '@verwaltung/types/datatransfer/dsb-mannschaft-dto.class';


const ID_PATH_PARAM = 'id';
const NOTIFICATION_DELETE_MANNSCHAFT = 'mannschaft_detail_delete';
const NOTIFICATION_DELETE_MANNSCHAFT_SUCCESS = 'mannschaft_detail_delete_success';
const NOTIFICATION_DELETE_MANNSCHAFT_FAILURE = 'mannschaft_detail_delete_failure';
const NOTIFICATION_SAVE_MANNSCHAFT = 'mannschaft_detail_save';
const NOTIFICATION_UPDATE_MANNSCHAFT = 'mannschaft_detail_update';
const NOTIFICATION_WARING_MANNSCHAFT = 'duplicate_mannschaft';

@Component({
  selector:    'bla-mannschaft-detail',
  templateUrl: './mannschaft-detail.component.html',
  styleUrls:   ['./mannschaft-detail.component.scss']
})
export class MannschaftDetailComponent extends CommonComponent implements OnInit {
  public config = MANNSCHAFT_DETAIL_CONFIG;
  public ButtonType = ButtonType;
  public currentMannschaft: DsbMannschaftDO = new DsbMannschaftDO();
  public currentVerein: VereinDO = new VereinDO();
  public currentVeranstaltung: VeranstaltungDO = new VeranstaltungDO();
  public ligen: Array<VeranstaltungDO> = [new VeranstaltungDO()];
  public mannschaften: Array<DsbMannschaftDO> = [new DsbMannschaftDO()];
  private duplicateMannschaftsNrNotification: Notification;
  private deleteNotification: Notification;
  private duplicateSubscription;
  private deleteSubscription;

  public deleteLoading = false;
  public saveLoading = false;
  private acceptedWarning = true;

  constructor(private mannschaftProvider: DsbMannschaftDataProviderService,
              private vereinProvider: VereinDataProviderService,
              private veranstaltungProvider: VeranstaltungDataProviderService,
              private mannschaftsDataProvider: DsbMannschaftDataProviderService,
              private router: Router,
              private route: ActivatedRoute,
              private notificationService: NotificationService) {
    super();
  }

  ngOnInit() {
    this.loading = true;

    this.loadVereinById(Number.parseInt(this.route.snapshot.url[1].path, 10));
    this.loadVeranstaltungen();

    this.notificationService.discardNotification();

    this.route.params.subscribe((params) => {
      if (!isUndefined(params[ID_PATH_PARAM])) {
        const id = params[ID_PATH_PARAM];
        if (id === 'add') {
          this.currentMannschaft = new DsbMannschaftDO();
          this.loading = false;
          this.deleteLoading = false;
          this.saveLoading = false;
        } else {
          this.loadById(params[ID_PATH_PARAM]);
        }
      }
    });

    // This Notification shows up, if a duplicate mannschaftsnummer is detected.
    // It gets subscribed once in ngOnInit and gets unsubscribed in ngOnDestroy
    this.duplicateMannschaftsNrNotification = {
      id:          NOTIFICATION_WARING_MANNSCHAFT,
      title:       'MANAGEMENT.VEREIN_DETAIL.NOTIFICATION.DUPLICATE.TITLE',
      description: 'MANAGEMENT.VEREIN_DETAIL.NOTIFICATION.DUPLICATE.DESCRIPTION',
      severity:    NotificationSeverity.QUESTION,
      origin:      NotificationOrigin.USER,
      type:        NotificationType.YES_NO,
      userAction:  NotificationUserAction.PENDING
    };

    console.log('subscribe notification');
    this.duplicateSubscription = this.notificationService.observeNotification(NOTIFICATION_WARING_MANNSCHAFT)
          .subscribe((myNotification) => {
            if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
              this.saveMannschaft();
            }
            if (myNotification.userAction === NotificationUserAction.DECLINED) {
              this.saveLoading = false;
            }
          });
  }



  ngOnDestroy() {
    this.duplicateSubscription.unsubscribe();
    if (this.deleteSubscription != null) {
      this.deleteSubscription.unsubscribe();
    }
  }


  public onSave(ignore: any): void {
    this.saveLoading = true;

    // persist
    this.currentMannschaft.vereinId = this.currentVerein.id; // Set selected verein id
    this.currentMannschaft.veranstaltungId = this.currentVeranstaltung.id; // set selected veranstaltung id
    this.currentMannschaft.benutzerId = 1;

    // within this method it will be checked if the mannschaftsnummer
    // is already used and start the saving process
    this.loadMannschaften(this.currentMannschaft.vereinId);
  }



  public onUpdate(ignore: any): void {
    this.saveLoading = true;

    // persist
    this.currentMannschaft.vereinId = this.currentVerein.id; // Set selected verein id

    this.mannschaftProvider.update(this.currentMannschaft)
        .then((response: BogenligaResponse<DsbMannschaftDO>) => {
          if (!isNullOrUndefined(response)
            && !isNullOrUndefined(response.payload)
            && !isNullOrUndefined(response.payload.id)) {

            const id = this.currentMannschaft.id;

            const notification: Notification = {
              id:          NOTIFICATION_UPDATE_MANNSCHAFT + id,
              title:       'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.SAVE.TITLE',
              description: 'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.SAVE.DESCRIPTION',
              severity:    NotificationSeverity.INFO,
              origin:      NotificationOrigin.USER,
              type:        NotificationType.OK,
              userAction:  NotificationUserAction.PENDING
            };

            this.notificationService.observeNotification(NOTIFICATION_UPDATE_MANNSCHAFT + id)
                .subscribe((myNotification) => {
                  if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
                    this.saveLoading = false;
                    this.router.navigateByUrl('/verwaltung/vereine/' + response.payload.vereinId);
                  }
                });

            this.notificationService.showNotification(notification);
          }
        }, (response: BogenligaResponse<DsbMitgliedDO>) => {
          console.log('Failed');
          this.saveLoading = false;
        });
    // show response message
  }

  public onDelete(ignore: any): void {
    this.deleteLoading = true;
    this.notificationService.discardNotification();

    const id = this.currentMannschaft.id;
    console.log(id);

    this.notificationService.showNotification(this.deleteNotification);
  }

  public entityExists(): boolean {
    return this.currentMannschaft.id >= 0;
  }

  private loadById(id: number) {
    this.mannschaftProvider.findById(id)
        .then((response: BogenligaResponse<DsbMannschaftDO>) => this.handleSuccess(response))
        .catch((response: BogenligaResponse<DsbMannschaftDO>) => this.handleFailure(response));
  }

  private loadVereinById(id: number) {
    this.vereinProvider.findById(id)
        .then((response: BogenligaResponse<VereinDO>) => this.handleVereinSuccess(response))
        .catch((response: BogenligaResponse<VereinDO>) => this.handleVereinFailure(response));
  }

  private loadVeranstaltungen() {
    this.veranstaltungProvider.findAll()
        .then((response: BogenligaResponse<VeranstaltungDO[]>) => this.handleVeranstaltungSuccess(response))
        .catch((response: BogenligaResponse<VeranstaltungDO[]>) => this.handleVeranstaltungFailure(response));
  }


  private handleSuccess(response: BogenligaResponse<DsbMannschaftDO>) {
    this.currentMannschaft = response.payload;
    console.log(this.currentMannschaft.id);
    const id = this.currentMannschaft.id;

    this.deleteNotification = {
      id:               NOTIFICATION_DELETE_MANNSCHAFT + id,
      title:            'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE.TITLE',
      description:      'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE.DESCRIPTION',
      descriptionParam: '' + id,
      severity:         NotificationSeverity.QUESTION,
      origin:           NotificationOrigin.USER,
      type:             NotificationType.YES_NO,
      userAction:       NotificationUserAction.PENDING
    };

    this.deleteSubscription = this.notificationService.observeNotification(NOTIFICATION_DELETE_MANNSCHAFT + id)
                                  .subscribe((myNotification) => {
                            console.log('inside delete ');
                            if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
                                      this.mannschaftProvider.deleteById(id)
                                          .then((response) => this.handleDeleteSuccess(response))
                                          .catch((response) => this.handleDeleteFailure(response));
                            } else if(myNotification.userAction === NotificationUserAction.DECLINED) {
                                this.deleteLoading = false;
                            }
                                  });
    this.loading = false;
  }

  private handleFailure(response: BogenligaResponse<DsbMannschaftDO>) {
    this.loading = false;
  }

  private handleVereinSuccess(response: BogenligaResponse<VereinDO>) {
    this.currentVerein = response.payload;
    this.loading = false;
  }

  private handleVereinFailure(response: BogenligaResponse<VereinDO>) {
    this.loading = false;
  }

  private handleVeranstaltungSuccess(response: BogenligaResponse<VeranstaltungDO[]>) {
    this.ligen = [];
    this.ligen = response.payload;
    this.currentVeranstaltung = this.ligen[0];
    this.loading = false;
  }

  private handleVeranstaltungFailure(response: BogenligaResponse<VeranstaltungDO[]>) {
    this.ligen = [];
    this.loading = false;
  }



  private handleDeleteSuccess(response: BogenligaResponse<void>): void {

    const notification: Notification = {
      id:          NOTIFICATION_DELETE_MANNSCHAFT_SUCCESS,
      title:       'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE_SUCCESS.TITLE',
      description: 'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE_SUCCESS.DESCRIPTION',
      severity:    NotificationSeverity.INFO,
      origin:      NotificationOrigin.USER,
      type:        NotificationType.OK,
      userAction:  NotificationUserAction.PENDING
    };

    this.notificationService.observeNotification(NOTIFICATION_DELETE_MANNSCHAFT_SUCCESS)
        .subscribe((myNotification) => {
          if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
            this.router.navigateByUrl('/verwaltung/vereine/' + this.currentMannschaft.vereinId);
            this.deleteLoading = false;
          }
        });

    this.notificationService.showNotification(notification);
  }

  private handleDeleteFailure(response: BogenligaResponse<void>): void {

    const notification: Notification = {
      id:          NOTIFICATION_DELETE_MANNSCHAFT_FAILURE,
      title:       'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE_FAILURE.TITLE',
      description: 'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.DELETE_FAILURE.DESCRIPTION',
      severity:    NotificationSeverity.ERROR,
      origin:      NotificationOrigin.USER,
      type:        NotificationType.OK,
      userAction:  NotificationUserAction.PENDING
    };

    this.notificationService.observeNotification(NOTIFICATION_DELETE_MANNSCHAFT_FAILURE)
        .subscribe((myNotification) => {
          if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
            this.deleteLoading = false;
          }
        });

    this.notificationService.showNotification(notification);
  }






  // private checkIfDuplicateMannschaftsNr(mannschaftsNr: Number): Boolean {
  private loadMannschaften(vereinsId: number) {
      this.mannschaftsDataProvider.findAllByVereinsId(vereinsId)
          .then((response: BogenligaResponse<DsbMannschaftDTO[]>) => this.handleLoadMannschaftenSuccess(response))
          .catch((response: BogenligaResponse<DsbMannschaftDTO[]>) => this.handleLoadMannschaftenFailure(response));
    }




  private handleLoadMannschaftenSuccess(response: BogenligaResponse<DsbMannschaftDTO[]>): void {
    this.mannschaften = [];
    this.mannschaften = response.payload;
    var mannschaftsNrs: Array<number> = new Array<number>();
    this.mannschaften.forEach((mannschaft) => mannschaftsNrs.push(parseInt(mannschaft.nummer)));
    var duplicateFound: boolean;
    mannschaftsNrs.forEach(nr => { if(nr==parseInt(this.currentMannschaft.nummer)){duplicateFound=true;}})
    if(duplicateFound) {
      this.notificationService.showNotification(this.duplicateMannschaftsNrNotification);
    }
    else {
      this.saveMannschaft();
    }
  }


  private handleLoadMannschaftenFailure(response: BogenligaResponse<DsbMannschaftDTO[]>): void {
    this.mannschaften = [];
    this.loading = false;
  }


   private saveMannschaft(): void {
    console.log('Saving mannschaft: ', this.currentMannschaft);

    this.mannschaftProvider.create(this.currentMannschaft, this.currentVerein)
        .then((response: BogenligaResponse<DsbMannschaftDO>) => {
          if (!isNullOrUndefined(response)
            && !isNullOrUndefined(response.payload)
            && !isNullOrUndefined(response.payload.id)) {
            console.log('Saved with id: ' + response.payload.id);

            const notification: Notification = {
              id:          NOTIFICATION_SAVE_MANNSCHAFT,
              title:       'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.SAVE.TITLE',
              description: 'MANAGEMENT.MANNSCHAFT_DETAIL.NOTIFICATION.SAVE.DESCRIPTION',
              severity:    NotificationSeverity.INFO,
              origin:      NotificationOrigin.USER,
              type:        NotificationType.OK,
              userAction:  NotificationUserAction.PENDING
            };

            this.notificationService.observeNotification(NOTIFICATION_SAVE_MANNSCHAFT)
                .subscribe((myNotification) => {
                  if (myNotification.userAction === NotificationUserAction.ACCEPTED) {
                    this.saveLoading = false;
                    this.router.navigateByUrl('/verwaltung/vereine/' + response.payload.vereinId);
                  }
                });

            this.notificationService.showNotification(notification);
          }
        }, (response: BogenligaResponse<DsbMitgliedDO>) => {
          console.log(response.payload);
          console.log('Failed');
          this.saveLoading = false;
        });
  }


}
