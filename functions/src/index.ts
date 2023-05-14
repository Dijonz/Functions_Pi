import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Message} from "firebase-admin/lib/messaging/messaging-api";

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


export const Notificao = functions.firestore
  .document("emergencias/{emergenciaId}")
  .onCreate(async (snapshot, context) => {
    const usersSnapshot = await admin.firestore().collection("users").get();
    const messages:Message[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const fcmToken = userData.token;

      const message = {
        notification: {
          title: "Nova emergencia",
          body: "uma nova emergencia foi registrada",
        },
        token: fcmToken,
      };
      messages.push(message);
    });

    await admin.messaging().sendEach(messages);
  });


