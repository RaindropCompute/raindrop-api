import amqp from "amqplib";

export const connection = await amqp.connect(process.env.AMQP_URL!);
