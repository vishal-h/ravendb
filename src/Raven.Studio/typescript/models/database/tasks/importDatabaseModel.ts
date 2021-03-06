﻿/// <reference path="../../../../typings/tsd.d.ts"/>

import smugglerDatabaseRecord = require("models/database/tasks/smugglerDatabaseRecord");

class importDatabaseModel {
    includeDatabaseRecord = ko.observable(true);
    includeDocuments = ko.observable(true);
    includeConflicts = ko.observable(true);
    includeIndexes = ko.observable(true);
    includeIdentities = ko.observable(true);
    includeCompareExchange = ko.observable(true);
    includeCounters = ko.observable(true);
    includeLegacyCounters = ko.observable(false);
    includeRevisionDocuments = ko.observable(true);
    includeLegacyAttachments = ko.observable(false);
    includeAttachments = ko.observable(true);
    includeSubscriptions = ko.observable(true);

    databaseModel = new smugglerDatabaseRecord();

    encryptedInput = ko.observable<boolean>(false);
    encryptionKey = ko.observable<string>();

    includeExpiredDocuments = ko.observable(true);
    includeArtificialDocuments = ko.observable(false);
    removeAnalyzers = ko.observable(false);
    
    transformScript = ko.observable<string>();

    validationGroup: KnockoutValidationGroup;
    importDefinitionHasIncludes: KnockoutComputed<boolean>;
    
    constructor() {
        this.initValidation();

        this.includeDocuments.subscribe(documents => {
            if (!documents) {
                this.includeCounters(false);
                this.includeAttachments(false);
                this.includeLegacyAttachments(false);
            }
        });
        
        this.removeAnalyzers.subscribe(analyzers => {
            if (analyzers) {
                this.includeIndexes(true);
            }
        });
        
        this.includeIndexes.subscribe(indexes => {
            if (!indexes) {
                this.removeAnalyzers(false);
            }
        });

        this.includeDatabaseRecord.subscribe(dbRecord => {
            if (!dbRecord) {
                this.databaseModel.customizeDatabaseRecordTypes(false);
            }
        });

        this.databaseModel.customizeDatabaseRecordTypes.subscribe(customize => {
            if (customize) {
                this.includeDatabaseRecord(true);
            }
        })
    }
    
    toDto(): Raven.Client.Documents.Smuggler.DatabaseSmugglerImportOptions {
        const operateOnTypes: Array<Raven.Client.Documents.Smuggler.DatabaseItemType> = [];
        const databaseRecordTypes = this.databaseModel.getDatabaseRecordTypes();
        
        if (this.includeDatabaseRecord() && databaseRecordTypes.length) {
            operateOnTypes.push("DatabaseRecord");
        }
        if (this.includeDocuments()) {
            operateOnTypes.push("Documents");
        }
        if (this.includeConflicts()) {
            operateOnTypes.push("Conflicts");
        }
        if (this.includeIndexes()) {
            operateOnTypes.push("Indexes");
        }
        if (this.includeRevisionDocuments()) {
            operateOnTypes.push("RevisionDocuments");
        }
        if (this.includeIdentities()){
            operateOnTypes.push("Identities");
        }
        if (this.includeCompareExchange()) {
            operateOnTypes.push("CompareExchange");
        }
        if (this.includeCounters()) {
            operateOnTypes.push("CounterGroups");
        }
        if (this.includeLegacyCounters()) {
            operateOnTypes.push("Counters");
        }
        if (this.includeAttachments()) {
            operateOnTypes.push("Attachments");
        }
        if (this.includeLegacyAttachments()) {
            operateOnTypes.push("LegacyAttachments");
        }
        if (this.includeSubscriptions()) {
            operateOnTypes.push("Subscriptions");
        }

        const recordTypes = databaseRecordTypes.length ? databaseRecordTypes.join(",") : undefined as Raven.Client.Documents.Smuggler.DatabaseRecordItemType;
        
        return {
            IncludeExpired: this.includeExpiredDocuments(),
            IncludeArtificial: this.includeArtificialDocuments(),
            TransformScript: this.transformScript(),
            RemoveAnalyzers: this.removeAnalyzers(),
            EncryptionKey: this.encryptedInput() ? this.encryptionKey() : undefined,
            OperateOnTypes: operateOnTypes.join(",") as Raven.Client.Documents.Smuggler.DatabaseItemType,
            OperateOnDatabaseRecordTypes: recordTypes
        } as Raven.Client.Documents.Smuggler.DatabaseSmugglerImportOptions;
    }

    private initValidation() {
        this.importDefinitionHasIncludes = ko.pureComputed(() => {
            return this.includeDatabaseRecord() 
                || this.includeConflicts() 
                || this.includeIndexes() 
                || this.includeIdentities() 
                || this.includeSubscriptions()
                || this.includeCompareExchange() 
                || this.includeLegacyAttachments() 
                || this.includeCounters() 
                || this.includeLegacyCounters()
                || this.includeRevisionDocuments() 
                || this.includeDocuments()
                || this.includeAttachments();
        });

        this.transformScript.extend({
            aceValidation: true
        });

        this.importDefinitionHasIncludes.extend({
            validation: [
                {
                    validator: () => this.importDefinitionHasIncludes(),
                    message: "Note: At least one 'include' option must be checked..."
                }
            ]
        });
        
        this.encryptionKey.extend({
            required: {
                onlyIf: () => this.encryptedInput()
            }
        });

        this.validationGroup = ko.validatedObservable({
            transformScript: this.transformScript,
            importDefinitionHasIncludes: this.importDefinitionHasIncludes,
            encryptionKey: this.encryptionKey,
            databaseRecordHasIncludes: this.databaseModel.hasIncludes
        });
    }
}

export = importDatabaseModel;
