Seam.Remoting.type.workspaceActions = function() {
  this.useTemplate = undefined;
  Seam.Remoting.type.workspaceActions.prototype.getUseTemplate = function() { return this.useTemplate; }
  Seam.Remoting.type.workspaceActions.prototype.setUseTemplate = function(useTemplate) { this.useTemplate = useTemplate; }
}

Seam.Remoting.type.workspaceActions.__name = "workspaceActions";
Seam.Remoting.type.workspaceActions.__metadata = [
  {field: "useTemplate", type: "bool"}];

Seam.Component.register(Seam.Remoting.type.workspaceActions);

Seam.Remoting.type.previewActions = function() {
  this.__callback = new Object();
  Seam.Remoting.type.previewActions.prototype.getPreviewPopupURL = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getPreviewPopupURL", [p0], callback, exceptionHandler);
  }
}
Seam.Remoting.type.previewActions.__name = "previewActions";

Seam.Component.register(Seam.Remoting.type.previewActions);

Seam.Remoting.type.clipboardActions = function() {
  this.__callback = new Object();
  Seam.Remoting.type.clipboardActions.prototype.pasteClipboardInside = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "pasteClipboardInside", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.clipboardActions.prototype.moveClipboardInside = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "moveClipboardInside", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.clipboardActions.prototype.putInClipboard = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "putInClipboard", [p0], callback, exceptionHandler);
  }
}
Seam.Remoting.type.clipboardActions.__name = "clipboardActions";

Seam.Component.register(Seam.Remoting.type.clipboardActions);

Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentRef = function() {
}

Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentRef.__name = "org.nuxeo.ecm.core.api.DocumentRef";
Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentRef.__metadata = [
];

Seam.Remoting.registerType(Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentRef);

Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob = function() {
  this.filename = undefined;
  this.digest = undefined;
  this.mimeType = undefined;
  this.encoding = undefined;
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.getFilename = function() { return this.filename; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.getDigest = function() { return this.digest; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.getMimeType = function() { return this.mimeType; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.getEncoding = function() { return this.encoding; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.setFilename = function(filename) { this.filename = filename; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.setDigest = function(digest) { this.digest = digest; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.setMimeType = function(mimeType) { this.mimeType = mimeType; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.prototype.setEncoding = function(encoding) { this.encoding = encoding; }
}

Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.__name = "org.nuxeo.ecm.core.api.Blob";
Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob.__metadata = [
  {field: "filename", type: "str"},
  {field: "digest", type: "str"},
  {field: "mimeType", type: "str"},
  {field: "encoding", type: "str"}];

Seam.Remoting.registerType(Seam.Remoting.type.org$nuxeo$ecm$core$api$Blob);

Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel = function() {
  this.lock = undefined;
  Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel.prototype.getLock = function() { return this.lock; }
  Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel.prototype.setLock = function(lock) { this.lock = lock; }
}

Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel.__name = "org.nuxeo.ecm.core.api.DocumentModel";
Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel.__metadata = [
  {field: "lock", type: "str"}];

Seam.Remoting.registerType(Seam.Remoting.type.org$nuxeo$ecm$core$api$DocumentModel);

Seam.Remoting.type.FileManageActions = function() {
  this.__callback = new Object();
  Seam.Remoting.type.FileManageActions.prototype.addFileFromPlugin = function(p0, p1, p2, p3, p4, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "addFileFromPlugin", [p0, p1, p2, p3, p4], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.addFolderFromPlugin = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "addFolderFromPlugin", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.checkMoveAllowed = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "checkMoveAllowed", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.moveWithId = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "moveWithId", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.copyWithId = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "copyWithId", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.pasteWithId = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "pasteWithId", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.removeSingleUploadedFile = function(callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "removeSingleUploadedFile", [], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.removeAllUploadedFile = function(callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "removeAllUploadedFile", [], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.removeUploadedFile = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "removeUploadedFile", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.addBinaryFileFromPlugin = function(p0, p1, p2, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "addBinaryFileFromPlugin", [p0, p1, p2], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.addBinaryFileFromPlugin = function(p0, p1, p2, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "addBinaryFileFromPlugin", [p0, p1, p2], callback, exceptionHandler);
  }
  Seam.Remoting.type.FileManageActions.prototype.canWrite = function(callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "canWrite", [], callback, exceptionHandler);
  }
}
Seam.Remoting.type.FileManageActions.__name = "FileManageActions";

Seam.Component.register(Seam.Remoting.type.FileManageActions);

Seam.Remoting.type.popupHelper = function() {
  this.__callback = new Object();
  Seam.Remoting.type.popupHelper.prototype.sendEmail = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "sendEmail", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getCurrentURL = function(callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getCurrentURL", [], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getCurrentURLAfterDelete = function(callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getCurrentURLAfterDelete", [], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.deleteDocument = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "deleteDocument", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.editTitle = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "editTitle", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.downloadDocument = function(p0, p1, p2, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "downloadDocument", [p0, p1, p2], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getAvailableActionId = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getAvailableActionId", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getUnavailableActionId = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getUnavailableActionId", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getNavigationURL = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getNavigationURL", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getNavigationURLOnContainer = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getNavigationURLOnContainer", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getNavigationURLOnPopupdoc = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getNavigationURLOnPopupdoc", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.getNavigationURLOnPopupdoc2 = function(p0, p1, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "getNavigationURLOnPopupdoc2", [p0, p1], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.lockDocument = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "lockDocument", [p0], callback, exceptionHandler);
  }
  Seam.Remoting.type.popupHelper.prototype.unlockDocument = function(p0, callback, exceptionHandler) {
    return Seam.Remoting.execute(this, "unlockDocument", [p0], callback, exceptionHandler);
  }
}
Seam.Remoting.type.popupHelper.__name = "popupHelper";

Seam.Component.register(Seam.Remoting.type.popupHelper);

Seam.Remoting.type.documentActions = function() {
  this.comment = undefined;
  Seam.Remoting.type.documentActions.prototype.getComment = function() { return this.comment; }
  Seam.Remoting.type.documentActions.prototype.setComment = function(comment) { this.comment = comment; }
}

Seam.Remoting.type.documentActions.__name = "documentActions";
Seam.Remoting.type.documentActions.__metadata = [
  {field: "comment", type: "str"}];

Seam.Component.register(Seam.Remoting.type.documentActions);

