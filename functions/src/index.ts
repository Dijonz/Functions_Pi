import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const firebase = admin.initializeApp();

type Usuario = {
  nome: string,
  email: string,
  telefone: string,
  curriculo: string,
  endereco: string,
  status: boolean
}

type CustomResponse = {
  status: string | unknown,
  message: string | unknown,
  payload: unknown,
}

/**
 * Essa função pura (sem ser cloud function)
 * verifica se o parametro data contem:
 * nome, email, telefone e uid (lembrando que
 * a senha não armazenamos no perfil do firestore).
 * @param {any} data - objeto data (any).
 * @return {boolean} - true se tiver dados corretos
 */
function hasAccountData(data: Usuario) {
  if (data.nome != undefined &&
      data.email != undefined &&
      data.telefone != undefined &&
      data.curriculo != undefined &&
      data.endereco != undefined &&
      data.status != undefined) {
    return true;
  } else {
    return false;
  }
}

export const setUser = functions
  .region("southamerica-east1")
  .runWith({enforceAppCheck: false})
  .https
  .onCall(async (data, context) => {
    const cResponse: CustomResponse = {
      status: "ERROR",
      message: "Dados não fornecidos",
      payload: undefined,
    };
    const usuario = (data as Usuario);
    if (hasAccountData(usuario)) {
      try {
        const doc = await firebase.firestore()
          .collection("users")
          .add(usuario);
        if (doc.id != undefined) {
          cResponse.status = "SUCCESS";
          cResponse.message = "Perfil de usuário inserido";
          cResponse.payload = JSON.stringify({docId: doc.id});
        } else {
          cResponse.status = "ERROR";
          cResponse.message = "Não foi possível inserir o perfil do usuário.";
          cResponse.payload = JSON.stringify({errorDetail: "doc.id"});
        }
      } catch (e) {
        let exMessage;
        if (e instanceof Error) {
          exMessage = e.message;
        }
        functions.logger.error("Erro ao incluir perfil:", usuario.email);
        functions.logger.error("Exception: ", exMessage);
        cResponse.status = "ERROR";
        cResponse.message = "Erro ao incluir usuário - Verificar Logs";
        cResponse.payload = null;
      }
    } else {
      cResponse.status = "ERROR";
      cResponse.message = "Perfil faltando informações";
      cResponse.payload = undefined;
    }
    return JSON.stringify(cResponse);
  });


export const sendFcmEmergencia = functions.firestore
  .document("emergencias/{emergenciasId}")
  .onCreate(async (snap, context) => {
    const documentData = snap.data();
    const userId = documentData.userId;

    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const user = userDoc.data();

    if (user) {
      const fcmToken = user.fcmToken;
      const message = {
        token: fcmToken,
        notification: {
          title: "EMERGENCIA! ",
          body: "Uma nova emergencia foi registrada!",
        },
      };
      await admin.messaging().sendToTopic("notifications", message);
      console.log("Notification sent: ", Response);
    }
  });

export const enviarNotificacaos = functions.firestore
  .document("emergencias/{emergenciaId}")
  .onCreate(async (snapshot, context) => {
    const emergencia = snapshot.data();

    const usersSnapshot = await admin.firestore().collection("users").get();

    const tokens: string[] = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.token) {
        tokens.push(userData.token);
      }
    });

    if (tokens.length > 0) {
      const payload = {
        notification: {
          title: "Nova emergência",
          body: `Uma nova emergência foi registrada em ${emergencia.local}`,
        },
      };

      await admin.messaging().sendToDevice(tokens, payload);
    }
  });


export const enviarNotificacao = functions.firestore
  .document("emergencias/{emergenciaId}")
  .onCreate(async (snapshot, context) => {
    const emergencia = snapshot.data();

    const usersSnapshot = await admin.firestore().collection("users").get();

    const tokens: string[] = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.token) {
        tokens.push(userData.token);
      }
    });

    for (const token of tokens) {
      const message = {
        notification: {
          title: "Nova emergência",
          body: `Uma nova emergência foi registrada em ${emergencia.local}`,
        },
        token,
      };
      await admin.messaging().send(message);
    }
  });

export const enviarNotificacao = functions.firestore
  .document("emergencias/{emergenciaId}")
  .onCreate(async (snapshot, context) => {
    const emergencia = snapshot.data();

    const usersSnapshot = await admin.firestore().collection("users").get();

    const message = {
      notification: {
        title: "Nova emergência",
        body: `Uma nova emergência foi registrada em ${emergencia.local}`,
      },
      token: 
    };
    await admin.messaging().send(message);
  });

